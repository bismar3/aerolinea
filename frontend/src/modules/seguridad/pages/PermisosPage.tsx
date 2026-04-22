import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_PERMISOS } from '../graphql/queries';
import { CREAR_PERMISO_MUTATION, ELIMINAR_PERMISO_MUTATION } from '../graphql/mutations';

// ── Tipos ──────────────────────────────────────────
interface Permiso {
  id: string;
  nombre: string;
  descripcion: string;
}

// ── Interfaces de respuesta ────────────────────────
interface GetPermisosResponse {
  allPermisos: Permiso[];
}

interface CrearPermisoResponse {
  crearPermiso: { ok: boolean; mensaje: string; permiso: Permiso };
}

interface EliminarPermisoResponse {
  eliminarPermiso: { ok: boolean; mensaje: string };
}

const PermisosPage = () => {
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState({ nombre: '', descripcion: '' });

  const { data, refetch } = useQuery<GetPermisosResponse>(GET_PERMISOS);

  const [crearPermiso] = useMutation<CrearPermisoResponse>(CREAR_PERMISO_MUTATION, {
    refetchQueries: [{ query: GET_PERMISOS }]
  });

  const [eliminarPermiso] = useMutation<EliminarPermisoResponse>(ELIMINAR_PERMISO_MUTATION, {
    refetchQueries: [{ query: GET_PERMISOS }]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMensaje('');
    try {
      const { data } = await crearPermiso({
        variables: { nombre: form.nombre, descripcion: form.descripcion }
      });
      if (data?.crearPermiso.ok) {
        setMensaje('✅ ' + data.crearPermiso.mensaje);
        setForm({ nombre: '', descripcion: '' });
        refetch();
      } else {
        setError(data?.crearPermiso.mensaje || 'Error');
      }
    } catch {
      setError('Error al conectar con el servidor');
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este permiso?')) return;
    await eliminarPermiso({ variables: { id: parseInt(id) } });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">🛡️ Permisos</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión de permisos del sistema</p>
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Permiso</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
            >
              Crear Permiso
            </button>
          </div>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.allPermisos?.map((p: Permiso) => (
              <tr key={p.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3">{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.nombre}</td>
                <td className="px-4 py-3">{p.descripcion || '-'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleEliminar(p.id)}
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
  );
};

export default PermisosPage;