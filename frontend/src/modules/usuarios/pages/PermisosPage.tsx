import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_PERMISOS } from '../graphql/queries'
import { CREAR_PERMISO_MUTATION, ELIMINAR_PERMISO_MUTATION } from '../graphql/mutations'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Permiso {
  idPermiso: string
  nombre: string
  descripcion: string
  estado: string
}

interface GetPermisosRes    { permisos: Permiso[] }
interface CrearPermisoRes   { crearPermiso:   { ok: boolean; mensaje: string; permiso: Permiso } }
interface EliminarPermisoRes { eliminarPermiso: { ok: boolean; mensaje: string } }

const PermisosPage = () => {
  const [mensaje, setMensaje] = useState('')
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({ nombre: '', descripcion: '' })

  const { data, refetch } = useQuery<GetPermisosRes>(GET_PERMISOS, { fetchPolicy: 'network-only' })

  const [crearPermiso]   = useMutation<CrearPermisoRes>(CREAR_PERMISO_MUTATION)
  const [eliminarPermiso] = useMutation<EliminarPermisoRes>(ELIMINAR_PERMISO_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    limpiar()
    try {
      const { data: res } = await crearPermiso({
        variables: { nombre: form.nombre, descripcion: form.descripcion }
      })
      if (res?.crearPermiso.ok) {
        mostrar(true, res.crearPermiso.mensaje)
        setForm({ nombre: '', descripcion: '' })
        refetch()
      } else {
        mostrar(false, res?.crearPermiso.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminar = async (idPermiso: string) => {
    if (!confirm('¿Eliminar este permiso? Los usuarios que lo tengan asignado perderán el acceso.')) return
    limpiar()
    try {
      const { data: res } = await eliminarPermiso({
        variables: { idPermiso: parseInt(idPermiso) }
      })
      if (res?.eliminarPermiso.ok) {
        mostrar(true, res.eliminarPermiso.mensaje)
        refetch()
      } else {
        mostrar(false, res?.eliminarPermiso.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">🛡️ Permisos</h1>
        <p className="text-slate-500 text-sm mt-1">Los 7 permisos del sistema BOA</p>
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error   && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Permiso</h2>
        <form onSubmit={handleCrear} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              required
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
          <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(data?.permisos || []).map(p => (
              <tr key={p.idPermiso} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400">{p.idPermiso}</td>
                <td className="px-4 py-3 font-medium">{p.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{p.descripcion || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    p.estado === 'activo'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleEliminar(p.idPermiso)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {(data?.permisos || []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">
                  No hay permisos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PermisosPage