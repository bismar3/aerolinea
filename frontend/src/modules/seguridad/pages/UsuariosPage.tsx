import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_USUARIOS, GET_ROLES, GET_ROL_PERMISOS, GET_ROL_PERMISO_USUARIOS } from '../graphql/queries';
import {
  CREAR_USUARIO_MUTATION,
  ACTUALIZAR_USUARIO_MUTATION,
  ELIMINAR_USUARIO_MUTATION,
  ASIGNAR_ROL_USUARIO_MUTATION,
  ASIGNAR_ROL_PERMISO_USUARIO_MUTATION,
  ELIMINAR_ROL_PERMISO_USUARIO_MUTATION,
} from '../graphql/mutations';

// ── Tipos ──────────────────────────────────────────
interface Usuario {
  id: string;
  userName: string;
  correoElectronico: string;
  estado: string;
  fechaCreacion: string;
}

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
}

interface Permiso {
  id: string;
  nombre: string;
}

interface RolPermiso {
  id: string;
  rol: Rol;
  permiso: Permiso;
}

interface RolPermisoUsuario {
  id: string;
  usuario: Usuario;
  rolPermiso: RolPermiso;
}

// ── Interfaces de respuesta ────────────────────────
interface GetUsuariosResponse { allUsuarios: Usuario[] }
interface GetRolesResponse { allRoles: Rol[] }
interface GetRolPermisosResponse { allRolPermisos: RolPermiso[] }
interface GetRolPermisoUsuariosResponse { allRolPermisoUsuarios: RolPermisoUsuario[] }
interface CrearUsuarioResponse {
  crearUsuario: { ok: boolean; mensaje: string; usuario: Usuario };
}
interface ActualizarUsuarioResponse {
  actualizarUsuario: { ok: boolean; mensaje: string; usuario: Usuario };
}
interface EliminarUsuarioResponse {
  eliminarUsuario: { ok: boolean; mensaje: string };
}
interface AsignarRolUsuarioResponse {
  asignarRolUsuario: { ok: boolean; mensaje: string };
}
interface AsignarRolPermisoUsuarioResponse {
  asignarRolPermisoUsuario: { ok: boolean; mensaje: string };
}
interface EliminarRolPermisoUsuarioResponse {
  eliminarRolPermisoUsuario: { ok: boolean; mensaje: string };
}

const UsuariosPage = () => {
  const [modo, setModo] = useState<'lista' | 'nuevo' | 'gestionar'>('lista');
  const [usuarioSel, setUsuarioSel] = useState<Usuario | null>(null);
  const [tab, setTab] = useState<'rol' | 'permisos' | 'datos' | 'ver'>('ver');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [rolSel, setRolSel] = useState('');
  const [rolPermisoSel, setRolPermisoSel] = useState('');

  const [formUsuario, setFormUsuario] = useState({
    userName: '', correoElectronico: '', contrasena: ''
  });
  const [formEditar, setFormEditar] = useState({
    userName: '', correoElectronico: ''
  });

  // Queries
  const { data: dataUsuarios, refetch: refetchUsuarios } = useQuery<GetUsuariosResponse>(GET_USUARIOS);
  const { data: dataRoles } = useQuery<GetRolesResponse>(GET_ROLES);
  const { data: dataRolPermisos } = useQuery<GetRolPermisosResponse>(GET_ROL_PERMISOS);
  const { data: dataRPU, refetch: refetchRPU } = useQuery<GetRolPermisoUsuariosResponse>(GET_ROL_PERMISO_USUARIOS);

  // Mutations
  const [crearUsuario] = useMutation<CrearUsuarioResponse>(CREAR_USUARIO_MUTATION, {
    refetchQueries: [{ query: GET_USUARIOS }]
  });
  const [actualizarUsuario] = useMutation<ActualizarUsuarioResponse>(ACTUALIZAR_USUARIO_MUTATION, {
    refetchQueries: [{ query: GET_USUARIOS }]
  });
  const [eliminarUsuario] = useMutation<EliminarUsuarioResponse>(ELIMINAR_USUARIO_MUTATION, {
    refetchQueries: [{ query: GET_USUARIOS }]
  });
  const [asignarRolUsuario] = useMutation<AsignarRolUsuarioResponse>(ASIGNAR_ROL_USUARIO_MUTATION, {
    refetchQueries: [{ query: GET_ROL_PERMISO_USUARIOS }]
  });
  const [asignarRolPermisoUsuario] = useMutation<AsignarRolPermisoUsuarioResponse>(
    ASIGNAR_ROL_PERMISO_USUARIO_MUTATION,
    { refetchQueries: [{ query: GET_ROL_PERMISO_USUARIOS }] }
  );
  const [eliminarRolPermisoUsuario] = useMutation<EliminarRolPermisoUsuarioResponse>(
    ELIMINAR_ROL_PERMISO_USUARIO_MUTATION,
    { refetchQueries: [{ query: GET_ROL_PERMISO_USUARIOS }] }
  );

  // ── Filtrar usuarios ───────────────────────────────
  const usuariosFiltrados = dataUsuarios?.allUsuarios?.filter(u =>
    u.userName.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.correoElectronico.toLowerCase().includes(busqueda.toLowerCase())
  ) || [];

  // ── Permisos del usuario seleccionado ──────────────
  const permisosUsuario = dataRPU?.allRolPermisoUsuarios?.filter(
    rpu => rpu.usuario.id === usuarioSel?.id
  ) || [];

  // ── Permisos disponibles no asignados aún ─────────
  const permisosDisponibles = dataRolPermisos?.allRolPermisos?.filter(
    rp => !permisosUsuario.some(pu => pu.rolPermiso.id === rp.id)
  ) || [];

  // ── Handlers ──────────────────────────────────────
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMensaje('');
    try {
      const { data } = await crearUsuario({
        variables: {
          userName: formUsuario.userName,
          correoElectronico: formUsuario.correoElectronico,
          contrasena: formUsuario.contrasena,
        }
      });
      if (data?.crearUsuario.ok) {
        setMensaje('✅ ' + data.crearUsuario.mensaje);
        setFormUsuario({ userName: '', correoElectronico: '', contrasena: '' });
        setModo('lista');
        refetchUsuarios();
      } else {
        setError(data?.crearUsuario.mensaje || 'Error');
      }
    } catch {
      setError('Error al conectar con el servidor');
    }
  };

  const handleGestionar = (usuario: Usuario) => {
    setUsuarioSel(usuario);
    setFormEditar({
      userName: usuario.userName,
      correoElectronico: usuario.correoElectronico
    });
    setModo('gestionar');
    setTab('ver');
    setError(''); setMensaje('');
  };

  const handleAsignarRol = async () => {
    if (!usuarioSel || !rolSel) return;
    setError(''); setMensaje('');
    try {
      const { data } = await asignarRolUsuario({
        variables: {
          idUsuario: parseInt(usuarioSel.id),
          idRol: parseInt(rolSel)
        }
      });
      if (data?.asignarRolUsuario.ok) {
        setMensaje('✅ ' + data.asignarRolUsuario.mensaje);
        setRolSel('');
        refetchRPU();
      } else {
        setError(data?.asignarRolUsuario.mensaje || 'Error');
      }
    } catch {
      setError('Error al conectar con el servidor');
    }
  };

  const handleAsignarPermiso = async () => {
    if (!usuarioSel || !rolPermisoSel) return;
    setError(''); setMensaje('');
    try {
      const { data } = await asignarRolPermisoUsuario({
        variables: {
          idUsuario: parseInt(usuarioSel.id),
          idRolPermiso: parseInt(rolPermisoSel)
        }
      });
      if (data?.asignarRolPermisoUsuario.ok) {
        setMensaje('✅ ' + data.asignarRolPermisoUsuario.mensaje);
        setRolPermisoSel('');
        refetchRPU();
      } else {
        setError(data?.asignarRolPermisoUsuario.mensaje || 'Error');
      }
    } catch {
      setError('Error al conectar con el servidor');
    }
  };

  const handleQuitarPermiso = async (id: string) => {
    if (!confirm('¿Quitar este permiso?')) return;
    await eliminarRolPermisoUsuario({ variables: { id: parseInt(id) } });
  };

  const handleActualizarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMensaje('');
    if (!usuarioSel) return;
    try {
      const { data } = await actualizarUsuario({
        variables: {
          id: parseInt(usuarioSel.id),
          userName: formEditar.userName,
          correoElectronico: formEditar.correoElectronico,
        }
      });
      if (data?.actualizarUsuario.ok) {
        setMensaje('✅ ' + data.actualizarUsuario.mensaje);
        refetchUsuarios();
      } else {
        setError(data?.actualizarUsuario.mensaje || 'Error');
      }
    } catch {
      setError('Error al conectar con el servidor');
    }
  };

  const handleEliminarUsuario = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    await eliminarUsuario({ variables: { id: parseInt(id) } });
    if (usuarioSel?.id === id) {
      setModo('lista');
      setUsuarioSel(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">👤 Gestión de Usuarios</h1>
          <p className="text-slate-500 text-sm mt-1">Administración de usuarios y asignación de roles</p>
        </div>
        {modo === 'lista' && (
          <button
            onClick={() => { setModo('nuevo'); setError(''); setMensaje(''); }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            + Nuevo Usuario
          </button>
        )}
        {(modo === 'nuevo' || modo === 'gestionar') && (
          <button
            onClick={() => { setModo('lista'); setUsuarioSel(null); setError(''); setMensaje(''); }}
            className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            ← Volver a lista
          </button>
        )}
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* ── MODO NUEVO ── */}
      {modo === 'nuevo' && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Usuario</h2>
          <form onSubmit={handleCrearUsuario} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
              <input
                type="text"
                value={formUsuario.userName}
                onChange={(e) => setFormUsuario({ ...formUsuario, userName: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
              <input
                type="email"
                value={formUsuario.correoElectronico}
                onChange={(e) => setFormUsuario({ ...formUsuario, correoElectronico: e.target.value })}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={formUsuario.contrasena}
                onChange={(e) => setFormUsuario({ ...formUsuario, contrasena: e.target.value })}
                required
                placeholder="Mín. 8 chars, mayúscula, número, especial"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
              >
                Crear Usuario
              </button>
              <button
                type="button"
                onClick={() => setModo('lista')}
                className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODO LISTA ── */}
      {modo === 'lista' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por usuario o correo..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u: Usuario) => (
                  <tr key={u.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{u.userName}</td>
                    <td className="px-4 py-3 text-slate-500">{u.correoElectronico}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(
                          dataRPU?.allRolPermisoUsuarios
                            ?.filter(rpu => rpu.usuario.id === u.id)
                            .map(rpu => rpu.rolPermiso.rol.nombre)
                        )].map((nombre, i) => (
                          <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                            {nombre}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${u.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleGestionar(u)}
                        className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs font-semibold transition"
                      >
                        Gestionar
                      </button>
                      <button
                        onClick={() => handleEliminarUsuario(u.id)}
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
      )}

      {/* ── MODO GESTIONAR ── */}
      {modo === 'gestionar' && usuarioSel && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            Editando: <span className="text-blue-800">{usuarioSel.userName}</span>
          </h2>
          <p className="text-slate-400 text-xs mb-4">{usuarioSel.correoElectronico}</p>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-slate-200">
            {([
              { key: 'ver', label: 'Ver Datos' },
              { key: 'rol', label: 'Asignar Rol' },
              { key: 'permisos', label: 'Asignar Permisos' },
              { key: 'datos', label: 'Editar Datos' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setError(''); setMensaje(''); }}
                className={`px-4 py-2 text-sm font-medium transition border-b-2
                  ${tab === t.key ? 'border-blue-800 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB VER DATOS ── */}
          {tab === 'ver' && (
            <div className="space-y-4">
              <table className="w-full text-sm max-w-lg">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 font-medium text-slate-500 w-32">Usuario</td>
                    <td className="py-2">{usuarioSel.userName}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium text-slate-500">Correo</td>
                    <td className="py-2">{usuarioSel.correoElectronico}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium text-slate-500">Estado</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${usuarioSel.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {usuarioSel.estado}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium text-slate-500">Creado</td>
                    <td className="py-2">{new Date(usuarioSel.fechaCreacion).toLocaleDateString('es-BO')}</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-slate-700 mt-4">Roles y Permisos asignados</h3>
              {permisosUsuario.length === 0 ? (
                <p className="text-slate-400 text-sm">Sin roles ni permisos asignados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-3 py-2">Rol</th>
                      <th className="px-3 py-2">Permiso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permisosUsuario.map((rpu: RolPermisoUsuario) => (
                      <tr key={rpu.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{rpu.rolPermiso.rol.nombre}</td>
                        <td className="px-3 py-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            {rpu.rolPermiso.permiso.nombre}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB ASIGNAR ROL ── */}
          {tab === 'rol' && (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rol actual:{' '}
                  <span className="text-blue-800 font-semibold">
                    {[...new Set(permisosUsuario.map(p => p.rolPermiso.rol.nombre))].join(', ') || 'Sin rol'}
                  </span>
                </label>
                <select
                  value={rolSel}
                  onChange={(e) => setRolSel(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar rol</option>
                  {dataRoles?.allRoles?.map((r: Rol) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAsignarRol}
                disabled={!rolSel}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                Asignar Rol
              </button>
            </div>
          )}

          {/* ── TAB ASIGNAR PERMISOS ── */}
          {tab === 'permisos' && (
            <div className="space-y-4">
              <div className="flex gap-3 items-end max-w-md">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Seleccionar permiso
                  </label>
                  <select
                    value={rolPermisoSel}
                    onChange={(e) => setRolPermisoSel(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Selecciona --</option>
                    {permisosDisponibles.map((rp: RolPermiso) => (
                      <option key={rp.id} value={rp.id}>
                        {rp.permiso.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAsignarPermiso}
                  disabled={!rolPermisoSel}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  Asignar
                </button>
              </div>

              <h3 className="text-sm font-semibold text-slate-700">Permisos actuales</h3>
              {permisosUsuario.length === 0 ? (
                <p className="text-slate-400 text-sm">Sin permisos asignados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-left">
                    <tr>
                      <th className="px-3 py-2">Rol</th>
                      <th className="px-3 py-2">Permiso</th>
                      <th className="px-3 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permisosUsuario.map((rpu: RolPermisoUsuario) => (
                      <tr key={rpu.id} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{rpu.rolPermiso.rol.nombre}</td>
                        <td className="px-3 py-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            {rpu.rolPermiso.permiso.nombre}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleQuitarPermiso(rpu.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── TAB EDITAR DATOS ── */}
          {tab === 'datos' && (
            <form onSubmit={handleActualizarUsuario} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                <input
                  type="text"
                  value={formEditar.userName}
                  onChange={(e) => setFormEditar({ ...formEditar, userName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
                <input
                  type="email"
                  value={formEditar.correoElectronico}
                  onChange={(e) => setFormEditar({ ...formEditar, correoElectronico: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={() => setModo('lista')}
                  className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default UsuariosPage;