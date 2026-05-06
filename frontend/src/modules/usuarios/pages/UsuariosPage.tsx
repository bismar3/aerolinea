import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_USUARIOS, GET_ROLES, GET_PERMISOS, GET_TODOS_PERMISOS_USUARIO } from '../graphql/queries'
import {
  CREAR_USUARIO_MUTATION,
  ACTUALIZAR_USUARIO_MUTATION,
  ELIMINAR_USUARIO_MUTATION,
  ASIGNAR_ROL_USUARIO_MUTATION,
  ASIGNAR_PERMISO_USUARIO_MUTATION,
  ELIMINAR_PERMISO_USUARIO_MUTATION,
} from '../graphql/mutations'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Rol {
  idRol: string
  nombre: string
  descripcion?: string
  estado: string
}

interface Permiso {
  idPermiso: string
  nombre: string
  descripcion?: string
  estado: string
}

interface Usuario {
  idUsuario: string
  nombreCompleto: string
  username: string
  correo: string
  telefono?: string
  estado: string
  bloqueado: boolean
  intentosFallidos: number
  idRol: Rol | null
}

interface PermisoUsuario {
  idRolPermisoUsuario: string
  idUsuario: { idUsuario: string; username: string }
  idPermiso: { idPermiso: string; nombre: string }
}

// ── Interfaces de respuesta ────────────────────────────────────────────────
interface GetUsuariosRes           { usuarios: Usuario[] }
interface GetRolesRes              { roles: Rol[] }
interface GetPermisosRes           { permisos: Permiso[] }
interface GetTodosPermisosUsuarioRes { todosPermisosUsuario: PermisoUsuario[] }

interface CrearUsuarioRes          { crearUsuario: { ok: boolean; mensaje: string; usuario: Usuario } }
interface ActualizarUsuarioRes     { actualizarUsuario: { ok: boolean; mensaje: string; usuario: Usuario } }
interface EliminarUsuarioRes       { eliminarUsuario: { ok: boolean; mensaje: string } }
interface AsignarRolRes            { asignarRolAUsuario: { ok: boolean; mensaje: string; usuario: Usuario } }
interface AsignarPermisoRes        { asignarPermisoAUsuario: { ok: boolean; mensaje: string } }
interface EliminarPermisoUsuarioRes { eliminarPermisoUsuario: { ok: boolean; mensaje: string } }

type Modo = 'lista' | 'nuevo' | 'gestionar'
type Tab  = 'ver' | 'rol' | 'permisos' | 'datos'

const UsuariosPage = () => {
  const [modo, setModo]             = useState<Modo>('lista')
  const [usuarioSel, setUsuarioSel] = useState<Usuario | null>(null)
  const [tab, setTab]               = useState<Tab>('ver')
  const [mensaje, setMensaje]       = useState('')
  const [error, setError]           = useState('')
  const [busqueda, setBusqueda]     = useState('')
  const [rolSel, setRolSel]         = useState('')
  const [permisoSel, setPermisoSel] = useState('')

  const [form, setForm] = useState({
    nombre: '', paterno: '', materno: '',
    username: '', correo: '', password: '', telefono: ''
  })
  const [formEditar, setFormEditar] = useState({
    nombre: '', paterno: '', materno: '', telefono: '', estado: ''
  })

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: dataUsuarios, refetch: refetchUsuarios } =
    useQuery<GetUsuariosRes>(GET_USUARIOS, { fetchPolicy: 'network-only' })

  const { data: dataRoles } =
    useQuery<GetRolesRes>(GET_ROLES, { fetchPolicy: 'network-only' })

  const { data: dataPermisos } =
    useQuery<GetPermisosRes>(GET_PERMISOS, { fetchPolicy: 'network-only' })

  const { data: dataPU, refetch: refetchPU } =
    useQuery<GetTodosPermisosUsuarioRes>(GET_TODOS_PERMISOS_USUARIO, { fetchPolicy: 'network-only' })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [crearUsuario]          = useMutation<CrearUsuarioRes>(CREAR_USUARIO_MUTATION)
  const [actualizarUsuario]     = useMutation<ActualizarUsuarioRes>(ACTUALIZAR_USUARIO_MUTATION)
  const [eliminarUsuario]       = useMutation<EliminarUsuarioRes>(ELIMINAR_USUARIO_MUTATION)
  const [asignarRol]            = useMutation<AsignarRolRes>(ASIGNAR_ROL_USUARIO_MUTATION)
  const [asignarPermiso]        = useMutation<AsignarPermisoRes>(ASIGNAR_PERMISO_USUARIO_MUTATION)
  const [eliminarPermisoUsuario] = useMutation<EliminarPermisoUsuarioRes>(ELIMINAR_PERMISO_USUARIO_MUTATION)

  // ── Datos derivados ───────────────────────────────────────────────────────
  const usuariosFiltrados = (dataUsuarios?.usuarios || []).filter(u =>
    u.username.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase())
  )

  const permisosDelUsuario = (dataPU?.todosPermisosUsuario || []).filter(
    pu => pu.idUsuario.idUsuario === usuarioSel?.idUsuario
  )

  const idsPermisosAsignados = new Set(permisosDelUsuario.map(pu => pu.idPermiso.idPermiso))

  const permisosDisponibles = (dataPermisos?.permisos || []).filter(
    p => !idsPermisosAsignados.has(p.idPermiso)
  )

  // ── Helpers ───────────────────────────────────────────────────────────────
  const limpiar = () => { setMensaje(''); setError('') }

  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCrear = async () => {
    limpiar()
    try {
      const { data } = await crearUsuario({ variables: form })
      if (data?.crearUsuario.ok) {
        mostrar(true, data.crearUsuario.mensaje)
        setForm({ nombre: '', paterno: '', materno: '', username: '', correo: '', password: '', telefono: '' })
        setModo('lista')
        refetchUsuarios()
      } else {
        mostrar(false, data?.crearUsuario.mensaje || 'Error')
      }
    } catch (e: any) {
      mostrar(false, e.message)
    }
  }

  const handleGestionar = (u: Usuario) => {
    setUsuarioSel(u)
    setFormEditar({
      nombre: u.nombreCompleto.split(' ')[0] || '',
      paterno: u.nombreCompleto.split(' ')[1] || '',
      materno: u.nombreCompleto.split(' ')[2] || '',
      telefono: u.telefono || '',
      estado: u.estado
    })
    setRolSel(u.idRol?.idRol || '')
    setPermisoSel('')
    setModo('gestionar')
    setTab('ver')
    limpiar()
    refetchPU()
  }

  const handleAsignarRol = async () => {
    if (!usuarioSel || !rolSel) return
    limpiar()
    try {
      const { data } = await asignarRol({
        variables: { idUsuario: parseInt(usuarioSel.idUsuario), idRol: parseInt(rolSel) }
      })
      if (data?.asignarRolAUsuario.ok) {
        mostrar(true, data.asignarRolAUsuario.mensaje)
        if (data.asignarRolAUsuario.usuario) setUsuarioSel(data.asignarRolAUsuario.usuario)
        refetchUsuarios()
      } else {
        mostrar(false, data?.asignarRolAUsuario.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleAsignarPermiso = async () => {
    if (!usuarioSel || !permisoSel) return
    limpiar()
    try {
      const { data } = await asignarPermiso({
        variables: { idUsuario: parseInt(usuarioSel.idUsuario), idPermiso: parseInt(permisoSel) }
      })
      if (data?.asignarPermisoAUsuario.ok) {
        mostrar(true, data.asignarPermisoAUsuario.mensaje)
        setPermisoSel('')
        refetchPU()
      } else {
        mostrar(false, data?.asignarPermisoAUsuario.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleQuitarPermiso = async (idRolPermisoUsuario: string) => {
    if (!confirm('¿Quitar este permiso del usuario?')) return
    limpiar()
    try {
      const { data } = await eliminarPermisoUsuario({
        variables: { idRolPermisoUsuario: parseInt(idRolPermisoUsuario) }
      })
      if (data?.eliminarPermisoUsuario.ok) {
        mostrar(true, data.eliminarPermisoUsuario.mensaje)
        refetchPU()
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleActualizar = async () => {
    if (!usuarioSel) return
    limpiar()
    try {
      const { data } = await actualizarUsuario({
        variables: { idUsuario: parseInt(usuarioSel.idUsuario), ...formEditar }
      })
      if (data?.actualizarUsuario.ok) {
        mostrar(true, data.actualizarUsuario.mensaje)
        setUsuarioSel(data.actualizarUsuario.usuario)
        refetchUsuarios()
      } else {
        mostrar(false, data?.actualizarUsuario.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminar = async (idUsuario: string) => {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return
    try {
      await eliminarUsuario({ variables: { idUsuario: parseInt(idUsuario) } })
      if (usuarioSel?.idUsuario === idUsuario) { setModo('lista'); setUsuarioSel(null) }
      refetchUsuarios()
    } catch (e: any) { mostrar(false, e.message) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">👤 Gestión de Usuarios</h1>
          <p className="text-slate-500 text-sm mt-1">Administración de usuarios y asignación de roles</p>
        </div>
        {modo === 'lista' && (
          <button
            onClick={() => { setModo('nuevo'); limpiar() }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            + Nuevo Usuario
          </button>
        )}
        {(modo === 'nuevo' || modo === 'gestionar') && (
          <button
            onClick={() => { setModo('lista'); setUsuarioSel(null); limpiar() }}
            className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            ← Volver a lista
          </button>
        )}
      </div>

      {/* Mensajes */}
      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error   && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* ── MODO NUEVO ─────────────────────────────────────────────────────── */}
      {modo === 'nuevo' && (
        <div className="bg-white rounded-xl shadow p-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Usuario</h2>
          <div className="grid grid-cols-2 gap-4">
            {([
              { label: 'Nombre *',   key: 'nombre',   type: 'text' },
              { label: 'Paterno',    key: 'paterno',  type: 'text' },
              { label: 'Materno',    key: 'materno',  type: 'text' },
              { label: 'Teléfono',   key: 'telefono', type: 'text' },
              { label: 'Username *', key: 'username', type: 'text' },
              { label: 'Correo *',   key: 'correo',   type: 'email' },
            ] as const).map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña *</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Mín. 8 caracteres, mayúscula y número"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCrear}
              className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
            >
              Crear Usuario
            </button>
            <button
              onClick={() => setModo('lista')}
              className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── MODO LISTA ─────────────────────────────────────────────────────── */}
      {modo === 'lista' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, username o correo..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(u => (
                  <tr key={u.idUsuario} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{u.nombreCompleto}</td>
                    <td className="px-4 py-3 text-slate-500">{u.username}</td>
                    <td className="px-4 py-3 text-slate-500">{u.correo}</td>
                    <td className="px-4 py-3">
                      {u.idRol
                        ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{u.idRol.nombre}</span>
                        : <span className="text-slate-400 text-xs italic">Sin rol</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        u.bloqueado          ? 'bg-red-100 text-red-700'
                        : u.estado === 'activo' ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.bloqueado ? 'bloqueado' : u.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGestionar(u)}
                          className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs font-semibold transition"
                        >
                          Gestionar
                        </button>
                        <button
                          onClick={() => handleEliminar(u.idUsuario)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODO GESTIONAR ─────────────────────────────────────────────────── */}
      {modo === 'gestionar' && usuarioSel && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            Editando: <span className="text-blue-800">{usuarioSel.username}</span>
          </h2>
          <p className="text-slate-400 text-xs mb-4">{usuarioSel.correo}</p>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-slate-200">
            {([
              { key: 'ver',      label: 'Ver Datos' },
              { key: 'rol',      label: 'Asignar Rol' },
              { key: 'permisos', label: 'Asignar Permisos' },
              { key: 'datos',    label: 'Editar Datos' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); limpiar() }}
                className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
                  tab === t.key
                    ? 'border-blue-800 text-blue-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB VER */}
          {tab === 'ver' && (
            <div className="space-y-4">
              <table className="w-full text-sm max-w-lg">
                <tbody>
                  {[
                    { label: 'Nombre completo', value: usuarioSel.nombreCompleto },
                    { label: 'Username',        value: usuarioSel.username },
                    { label: 'Correo',          value: usuarioSel.correo },
                    { label: 'Teléfono',        value: usuarioSel.telefono || '—' },
                    { label: 'Estado',          value: usuarioSel.estado },
                  ].map(row => (
                    <tr key={row.label} className="border-b">
                      <td className="py-2 font-medium text-slate-500 w-40">{row.label}</td>
                      <td className="py-2">{row.value}</td>
                    </tr>
                  ))}
                  <tr className="border-b">
                    <td className="py-2 font-medium text-slate-500">Rol</td>
                    <td className="py-2">
                      {usuarioSel.idRol
                        ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">{usuarioSel.idRol.nombre}</span>
                        : <span className="text-slate-400 text-xs italic">Sin rol</span>
                      }
                    </td>
                  </tr>
                </tbody>
              </table>

              <h3 className="text-sm font-semibold text-slate-700 mt-4">Permisos asignados</h3>
              {permisosDelUsuario.length === 0
                ? <p className="text-slate-400 text-sm">Sin permisos asignados</p>
                : (
                  <div className="flex flex-wrap gap-2">
                    {permisosDelUsuario.map(pu => (
                      <span key={pu.idRolPermisoUsuario} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {pu.idPermiso.nombre}
                      </span>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* TAB ROL */}
          {tab === 'rol' && (
            <div className="space-y-4 max-w-md">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <span className="text-slate-500">Rol actual: </span>
                {usuarioSel.idRol
                  ? <span className="font-semibold text-blue-800">{usuarioSel.idRol.nombre}</span>
                  : <span className="text-slate-400 italic">Sin rol asignado</span>
                }
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar rol</label>
                <select
                  value={rolSel}
                  onChange={e => setRolSel(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar rol --</option>
                  {dataRoles?.roles.map(r => (
                    <option key={r.idRol} value={r.idRol}>{r.nombre}</option>
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
              <p className="text-xs text-slate-400">
                ⚠ Cambiar el rol no modifica los permisos. Los permisos se gestionan por separado.
              </p>
            </div>
          )}

          {/* TAB PERMISOS */}
          {tab === 'permisos' && (
            <div className="space-y-4">
              <div className="flex gap-3 items-end max-w-md">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Agregar permiso</label>
                  <select
                    value={permisoSel}
                    onChange={e => setPermisoSel(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar permiso --</option>
                    {permisosDisponibles.map(p => (
                      <option key={p.idPermiso} value={p.idPermiso}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAsignarPermiso}
                  disabled={!permisoSel}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  Asignar
                </button>
              </div>

              <h3 className="text-sm font-semibold text-slate-700">Permisos actuales</h3>
              {permisosDelUsuario.length === 0
                ? <p className="text-slate-400 text-sm">Sin permisos asignados</p>
                : (
                  <table className="w-full text-sm max-w-lg">
                    <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2">Permiso</th>
                        <th className="px-3 py-2">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permisosDelUsuario.map(pu => (
                        <tr key={pu.idRolPermisoUsuario} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                              {pu.idPermiso.nombre}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleQuitarPermiso(pu.idRolPermisoUsuario)}
                              className="text-red-500 hover:text-red-700 text-xs font-semibold"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {/* TAB DATOS */}
          {tab === 'datos' && (
            <div className="space-y-4 max-w-md">
              {([
                { label: 'Nombre',   key: 'nombre' },
                { label: 'Paterno',  key: 'paterno' },
                { label: 'Materno',  key: 'materno' },
                { label: 'Teléfono', key: 'telefono' },
              ] as const).map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type="text"
                    value={formEditar[key]}
                    onChange={e => setFormEditar({ ...formEditar, [key]: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <button
                  onClick={handleActualizar}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Guardar Cambios
                </button>
                <button
                  onClick={() => setModo('lista')}
                  className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UsuariosPage