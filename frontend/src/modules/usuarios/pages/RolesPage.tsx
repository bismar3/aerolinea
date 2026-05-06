import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_ROLES } from '../graphql/queries'
import {
  CREAR_ROL_MUTATION,
  ACTUALIZAR_ROL_MUTATION,
  ELIMINAR_ROL_MUTATION,
} from '../graphql/mutations'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Rol {
  idRol: string
  nombre: string
  descripcion: string
  estado: string
}

interface GetRolesRes   { roles: Rol[] }
interface CrearRolRes   { crearRol:    { ok: boolean; mensaje: string; rol: Rol } }
interface ActualizarRolRes { actualizarRol: { ok: boolean; mensaje: string; rol: Rol } }
interface EliminarRolRes { eliminarRol: { ok: boolean; mensaje: string } }

const RolesPage = () => {
  const [mensaje, setMensaje]     = useState('')
  const [error, setError]         = useState('')
  const [modo, setModo]           = useState<'lista' | 'nuevo' | 'editar'>('lista')
  const [rolSel, setRolSel]       = useState<Rol | null>(null)
  const [form, setForm]           = useState({ nombre: '', descripcion: '' })
  const [formEditar, setFormEditar] = useState({ nombre: '', descripcion: '', estado: '' })

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, refetch } = useQuery<GetRolesRes>(GET_ROLES, { fetchPolicy: 'network-only' })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [crearRol]      = useMutation<CrearRolRes>(CREAR_ROL_MUTATION)
  const [actualizarRol] = useMutation<ActualizarRolRes>(ACTUALIZAR_ROL_MUTATION)
  const [eliminarRol]   = useMutation<EliminarRolRes>(ELIMINAR_ROL_MUTATION)

  // ── Helpers ───────────────────────────────────────────────────────────────
  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCrear = async () => {
    limpiar()
    if (!form.nombre.trim()) return setError('El nombre es requerido')
    try {
      const { data: res } = await crearRol({
        variables: { nombre: form.nombre, descripcion: form.descripcion }
      })
      if (res?.crearRol.ok) {
        mostrar(true, res.crearRol.mensaje)
        setForm({ nombre: '', descripcion: '' })
        setModo('lista')
        refetch()
      } else {
        mostrar(false, res?.crearRol.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEditar = (rol: Rol) => {
    setRolSel(rol)
    setFormEditar({ nombre: rol.nombre, descripcion: rol.descripcion || '', estado: rol.estado })
    setModo('editar')
    limpiar()
  }

  const handleActualizar = async () => {
    if (!rolSel) return
    limpiar()
    try {
      const { data: res } = await actualizarRol({
        variables: { idRol: parseInt(rolSel.idRol), ...formEditar }
      })
      if (res?.actualizarRol.ok) {
        mostrar(true, res.actualizarRol.mensaje)
        setModo('lista')
        refetch()
      } else {
        mostrar(false, res?.actualizarRol.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminar = async (idRol: string) => {
    if (!confirm('¿Eliminar este rol?')) return
    limpiar()
    try {
      const { data: res } = await eliminarRol({ variables: { idRol: parseInt(idRol) } })
      if (res?.eliminarRol.ok) {
        mostrar(true, res.eliminarRol.mensaje)
        refetch()
      } else {
        mostrar(false, res?.eliminarRol.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🔑 Roles</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de roles del sistema</p>
        </div>
        {modo === 'lista' && (
          <button
            onClick={() => { setModo('nuevo'); limpiar() }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            + Nuevo Rol
          </button>
        )}
        {(modo === 'nuevo' || modo === 'editar') && (
          <button
            onClick={() => { setModo('lista'); setRolSel(null); limpiar() }}
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
        <div className="bg-white rounded-xl shadow p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Rol</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCrear}
                className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
              >
                Crear Rol
              </button>
              <button
                onClick={() => setModo('lista')}
                className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODO EDITAR ────────────────────────────────────────────────────── */}
      {modo === 'editar' && rolSel && (
        <div className="bg-white rounded-xl shadow p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Editando: <span className="text-blue-800">{rolSel.nombre}</span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formEditar.nombre}
                onChange={e => setFormEditar({ ...formEditar, nombre: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <input
                type="text"
                value={formEditar.descripcion}
                onChange={e => setFormEditar({ ...formEditar, descripcion: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select
                value={formEditar.estado}
                onChange={e => setFormEditar({ ...formEditar, estado: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
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
        </div>
      )}

      {/* ── MODO LISTA ─────────────────────────────────────────────────────── */}
      {modo === 'lista' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data?.roles || []).map(r => (
                <tr key={r.idRol} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{r.descripcion || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      r.estado === 'activo'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditar(r)}
                        className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs font-semibold transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(r.idRol)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.roles || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">
                    No hay roles registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RolesPage