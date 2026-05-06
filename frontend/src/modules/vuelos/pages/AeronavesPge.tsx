import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_AERONAVES } from '../graphql/queries'
import {
  CREAR_AERONAVE_MUTATION,
  ACTUALIZAR_AERONAVE_MUTATION,
  ELIMINAR_AERONAVE_MUTATION,
} from '../graphql/mutations'

interface Aeronave {
  idAeronave: string
  codigoAeronave: string
  modelo: string
  tipoPasillo: string
  asientosEconomica: number
  asientosEconomicaPremium: number
  asientosEjecutiva: number
  asientosPrimeraClase: number
  totalAsientos: number
  estado: string
}

interface GetAeronavesRes       { aeronaves: Aeronave[] }
interface CrearAeronaveRes      { crearAeronave:     { ok: boolean; mensaje: string; aeronave: Aeronave; totalAsientos: number } }
interface ActualizarAeronaveRes { actualizarAeronave: { ok: boolean; mensaje: string; aeronave: Aeronave } }
interface EliminarAeronaveRes   { eliminarAeronave:  { ok: boolean; mensaje: string } }

const AeronavesPge = () => {
  const [modo, setModo]       = useState<'lista' | 'nuevo' | 'editar'>('lista')
  const [sel, setSel]         = useState<Aeronave | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    codigoAeronave: '', modelo: '', tipoPasillo: 'simple',
    asientosEconomica: '', asientosEconomicaPremium: '0',
    asientosEjecutiva: '0', asientosPrimeraClase: '0'
  })
  const [formEditar, setFormEditar] = useState({ modelo: '', estado: '' })

  const { data, refetch }    = useQuery<GetAeronavesRes>(GET_AERONAVES, { fetchPolicy: 'network-only' })
  const [crearAeronave]      = useMutation<CrearAeronaveRes>(CREAR_AERONAVE_MUTATION)
  const [actualizarAeronave] = useMutation<ActualizarAeronaveRes>(ACTUALIZAR_AERONAVE_MUTATION)
  const [eliminarAeronave]   = useMutation<EliminarAeronaveRes>(ELIMINAR_AERONAVE_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  // Total de asientos en el formulario
  const totalForm = () =>
    (parseInt(form.asientosEconomica) || 0) +
    (parseInt(form.asientosEconomicaPremium) || 0) +
    (parseInt(form.asientosEjecutiva) || 0) +
    (parseInt(form.asientosPrimeraClase) || 0)

  const handleCrear = async () => {
    limpiar()
    if (!form.codigoAeronave || !form.modelo || !form.asientosEconomica) {
      return mostrar(false, 'Código, modelo y asientos económica son requeridos')
    }
    try {
      const { data: res } = await crearAeronave({
        variables: {
          codigoAeronave:           form.codigoAeronave,
          modelo:                   form.modelo,
          tipoPasillo:              form.tipoPasillo,
          asientosEconomica:        parseInt(form.asientosEconomica),
          asientosEconomicaPremium: parseInt(form.asientosEconomicaPremium || '0'),
          asientosEjecutiva:        parseInt(form.asientosEjecutiva || '0'),
          asientosPrimeraClase:     parseInt(form.asientosPrimeraClase || '0'),
        }
      })
      if (res?.crearAeronave.ok) {
        mostrar(true, res.crearAeronave.mensaje)
        setForm({ codigoAeronave: '', modelo: '', tipoPasillo: 'simple', asientosEconomica: '', asientosEconomicaPremium: '0', asientosEjecutiva: '0', asientosPrimeraClase: '0' })
        setModo('lista')
        refetch()
      } else {
        mostrar(false, res?.crearAeronave.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEditar = (a: Aeronave) => {
    setSel(a)
    setFormEditar({ modelo: a.modelo, estado: a.estado })
    setModo('editar')
    limpiar()
  }

  const handleActualizar = async () => {
    if (!sel) return
    limpiar()
    try {
      const { data: res } = await actualizarAeronave({
        variables: { idAeronave: parseInt(sel.idAeronave), ...formEditar }
      })
      if (res?.actualizarAeronave.ok) {
        mostrar(true, res.actualizarAeronave.mensaje)
        setModo('lista')
        refetch()
      } else {
        mostrar(false, res?.actualizarAeronave.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminar = async (idAeronave: string) => {
    if (!confirm('¿Eliminar esta aeronave? Se eliminarán todos sus asientos.')) return
    limpiar()
    try {
      const { data: res } = await eliminarAeronave({ variables: { idAeronave: parseInt(idAeronave) } })
      if (res?.eliminarAeronave.ok) {
        mostrar(true, res.eliminarAeronave.mensaje)
        refetch()
      } else {
        mostrar(false, res?.eliminarAeronave.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Aeronaves</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de aeronaves BOA</p>
        </div>
        {modo === 'lista' && (
          <button onClick={() => { setModo('nuevo'); limpiar() }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            + Nueva Aeronave
          </button>
        )}
        {(modo === 'nuevo' || modo === 'editar') && (
          <button onClick={() => { setModo('lista'); setSel(null); limpiar() }}
            className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition">
            ← Volver a lista
          </button>
        )}
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error   && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* ── NUEVO ─────────────────────────────────────────────────────────── */}
      {modo === 'nuevo' && (
        <div className="flex gap-6 max-w-4xl">
          {/* Formulario */}
          <div className="flex-1 bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Nueva Aeronave</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
                  <input type="text" value={form.codigoAeronave} placeholder="ej: BOA-737"
                    onChange={e => setForm({ ...form, codigoAeronave: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo *</label>
                  <input type="text" value={form.modelo} placeholder="ej: Boeing 737-800"
                    onChange={e => setForm({ ...form, modelo: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de pasillo</label>
                <select value={form.tipoPasillo} onChange={e => setForm({ ...form, tipoPasillo: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="simple">Un pasillo (6 asientos/fila — nacional)</option>
                  <option value="doble">Dos pasillos (10 asientos/fila — internacional)</option>
                </select>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Asientos por clase</p>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    { label: 'Económica *',         key: 'asientosEconomica' },
                    { label: 'Económica Premium',    key: 'asientosEconomicaPremium' },
                    { label: 'Ejecutiva',            key: 'asientosEjecutiva' },
                    { label: 'Primera Clase',        key: 'asientosPrimeraClase' },
                  ] as const).map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                      <input type="number" min="0" value={form[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCrear}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">
                  Guardar
                </button>
                <button onClick={() => setModo('lista')}
                  className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition">
                  Cancelar
                </button>
              </div>
            </div>
          </div>

          {/* Panel resumen */}
          <div className="w-72 bg-white rounded-xl shadow p-6 h-fit">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Resumen de la aeronave</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 text-slate-500">Código</td>
                  <td className="py-2 font-medium text-right">{form.codigoAeronave || '—'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-slate-500">Modelo</td>
                  <td className="py-2 font-medium text-right">{form.modelo || '—'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-slate-500">Pasillo</td>
                  <td className="py-2 font-medium text-right">{form.tipoPasillo === 'simple' ? 'Un pasillo' : 'Dos pasillos'}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs font-semibold text-slate-500 uppercase mt-4 mb-2">Asientos por clase</p>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: 'Primera Clase',      val: form.asientosPrimeraClase },
                  { label: 'Ejecutiva',           val: form.asientosEjecutiva },
                  { label: 'Econ. Premium',       val: form.asientosEconomicaPremium },
                  { label: 'Económica',           val: form.asientosEconomica },
                ].map(row => (
                  <tr key={row.label} className="border-b">
                    <td className="py-2 text-slate-500">{row.label}</td>
                    <td className="py-2 font-medium text-right">{row.val || 0}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="py-2 font-semibold text-slate-700">Total</td>
                  <td className="py-2 font-bold text-blue-800 text-right">{totalForm()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EDITAR ────────────────────────────────────────────────────────── */}
      {modo === 'editar' && sel && (
        <div className="bg-white rounded-xl shadow p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Editando: <span className="text-blue-800">{sel.codigoAeronave}</span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
              <input type="text" value={formEditar.modelo}
                onChange={e => setFormEditar({ ...formEditar, modelo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select value={formEditar.estado}
                onChange={e => setFormEditar({ ...formEditar, estado: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="mantenimiento">En mantenimiento</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleActualizar}
              className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">
              Guardar Cambios
            </button>
            <button onClick={() => setModo('lista')}
              className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── LISTA ─────────────────────────────────────────────────────────── */}
      {modo === 'lista' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Pasillo</th>
                <th className="px-4 py-3">1ra Clase</th>
                <th className="px-4 py-3">Ejecutiva</th>
                <th className="px-4 py-3">Econ. Premium</th>
                <th className="px-4 py-3">Económica</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data?.aeronaves || []).map(a => (
                <tr key={a.idAeronave} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{a.codigoAeronave}</td>
                  <td className="px-4 py-3">{a.modelo}</td>
                  <td className="px-4 py-3">{a.tipoPasillo === 'simple' ? 'Un pasillo' : 'Dos pasillos'}</td>
                  <td className="px-4 py-3 text-center">{a.asientosPrimeraClase}</td>
                  <td className="px-4 py-3 text-center">{a.asientosEjecutiva}</td>
                  <td className="px-4 py-3 text-center">{a.asientosEconomicaPremium}</td>
                  <td className="px-4 py-3 text-center">{a.asientosEconomica}</td>
                  <td className="px-4 py-3 text-center font-semibold">{a.totalAsientos}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      a.estado === 'activo'         ? 'bg-green-100 text-green-700' :
                      a.estado === 'mantenimiento'  ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{a.estado}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditar(a)}
                        className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs font-semibold transition">
                        Editar
                      </button>
                      <button onClick={() => handleEliminar(a.idAeronave)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.aeronaves || []).length === 0 && (
                <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-400 text-sm">No hay aeronaves registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AeronavesPge