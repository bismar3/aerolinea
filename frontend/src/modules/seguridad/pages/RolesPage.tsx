import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_ROLES, GET_PERMISOS, GET_ROL_PERMISOS } from '../graphql/queries';
import {
  CREAR_ROL_MUTATION,
  ELIMINAR_ROL_MUTATION,
  ASIGNAR_ROL_PERMISO_MUTATION,
  ELIMINAR_ROL_PERMISO_MUTATION,
} from '../graphql/mutations';

// ── Tipos ──────────────────────────────────────────
interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
}

interface Permiso {
  id: string;
  nombre: string;
  descripcion: string;
}

interface RolPermiso {
  id: string;
  rol: Rol;
  permiso: Permiso;
}

// ── Interfaces de respuesta ────────────────────────
interface GetRolesResponse { allRoles: Rol[] }
interface GetPermisosResponse { allPermisos: Permiso[] }
interface GetRolPermisosResponse { allRolPermisos: RolPermiso[] }
interface CrearRolResponse {
  crearRol: { ok: boolean; mensaje: string; rol: Rol };
}
interface EliminarRolResponse {
  eliminarRol: { ok: boolean; mensaje: string };
}
interface AsignarRolPermisoResponse {
  asignarRolPermiso: { ok: boolean; mensaje: string; rolPermiso: { id: string } };
}
interface EliminarRolPermisoResponse {
  eliminarRolPermiso: { ok: boolean; mensaje: string };
}

const RolesPage = () => {
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [formAsignar, setFormAsignar] = useState({ idRol: '', idPermiso: '' });

  const { data: dataRoles, refetch: refetchRoles } = useQuery<GetRolesResponse>(GET_ROLES);
  const { data: dataPermisos } = useQuery<GetPermisosResponse>(GET_PERMISOS);
  const { data: dataRolPermisos, refetch: refetchRolPermisos } = useQuery<GetRolPermisosResponse>(GET_ROL_PERMISOS);

  const [crearRol] = useMutation<CrearRolResponse>(CREAR_ROL_MUTATION, {
    refetchQueries: [{ query: GET_ROLES }]
  });
  const [eliminarRol] = useMutation<EliminarRolResponse>(ELIMINAR_ROL_MUTATION, {
    refetchQueries: [{ query: GET_ROLES }]
  });
  const [asignarRolPermiso] = useMutation<AsignarRolPermisoResponse>(ASIGNAR_ROL_PERMISO_MUTATION, {
    refetchQueries: [{ query: GET_ROL_PERMISOS }]
  });
  const [eliminarRolPermiso] = useMutation<EliminarRolPermisoResponse>(ELIMINAR_ROL_PERMISO_MUTATION, {
    refetchQueries: [{ query: GET_ROL_PERMISOS }]
  });

  const handleCrearRol = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMensaje('');
    try {
      const { data } = await crearRol({
        variables: { nombre: form.nombre, descripcion: form.descripcion }
      });
      if (data?.crearRol.ok) {
        setMensaje('✅ ' + data.crearRol.mensaje);
        setForm({ nombre: '', descripcion: '' });
        refetchRoles();
      } else {
        setError(data?.crearRol.mensaje || 'Error');
      }
    } catch {
      setError('Error al conectar con el servidor');
    }
  };

  const handleAsignarPermiso = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMensaje('');
    try {
      const { data } = await asignarRolPermiso({
        variables: {
          idRol: parseInt(formAsignar.idRol),
          idPermiso: parseInt(formAsignar.idPermiso)
        }
      });
      if (data?.asignarRolPermiso.ok) {
        setMensaje('✅ ' + data.asignarRolPermiso.mensaje);
        setFormAsignar({ idRol: '', idPermiso: '' });
        refetchRolPermisos();
      } else {
        setError(data?.asignarRolPermiso.mensaje || 'Error');
      }
    } catch {
      setError('Error al conectar con el servidor');
    }
  };

  const handleEliminarRol = async (id: string) => {
    if (!confirm('¿Eliminar este rol?')) return;
    await eliminarRol({ variables: { id: parseInt(id) } });
  };

  const handleEliminarRolPermiso = async (id: string) => {
    if (!confirm('¿Quitar este permiso del rol?')) return;
    await eliminarRolPermiso({ variables: { id: parseInt(id) } });
    refetchRolPermisos();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">🔑 Roles</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión de roles y asignación de permisos</p>
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Crear rol */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Rol</h2>
          <form onSubmit={handleCrearRol} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
            >
              Crear Rol
            </button>
          </form>
        </div>

        {/* Asignar permiso a rol */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Asignar Permiso a Rol</h2>
          <form onSubmit={handleAsignarPermiso} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <select
                value={formAsignar.idRol}
                onChange={(e) => setFormAsignar({ ...formAsignar, idRol: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar rol</option>
                {dataRoles?.allRoles?.map((r: Rol) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Permiso</label>
              <select
                value={formAsignar.idPermiso}
                onChange={(e) => setFormAsignar({ ...formAsignar, idPermiso: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar permiso</option>
                {dataPermisos?.allPermisos?.map((p: Permiso) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
            >
              Asignar Permiso
            </button>
          </form>
        </div>

        {/* Tabla roles */}
        <div className="bg-white rounded-xl shadow overflow-hidden lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 p-4 border-b">Roles registrados</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Permisos asignados</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dataRoles?.allRoles?.map((r: Rol) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.nombre}</td>
                  <td className="px-4 py-3">{r.descripcion || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {dataRolPermisos?.allRolPermisos
                        ?.filter((rp: RolPermiso) => rp.rol.id === r.id)
                        .map((rp: RolPermiso) => (
                          <span
                            key={rp.id}
                            onClick={() => handleEliminarRolPermiso(rp.id)}
                            className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs cursor-pointer hover:bg-red-100 hover:text-red-700 transition"
                            title="Click para quitar permiso"
                          >
                            {rp.permiso.nombre} ✕
                          </span>
                        ))
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEliminarRol(r.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default RolesPage;