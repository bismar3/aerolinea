import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_EGRESOS, GET_EGRESOS_POR_FECHA } from '../graphql/queries'
import { CREAR_EGRESO_MANUAL_MUTATION } from '../graphql/mutations'

interface Egreso {
  idEgreso: string; concepto: string; tipo: string
  monto: number; fecha: string; observaciones: string; idDevolucion: number | null
}

interface GetEgresosRes    { egresos: Egreso[]; egresosPorFecha: Egreso[] }
interface CrearEgresoRes   { crearEgresoManual: { ok: boolean; mensaje: string; egreso: Egreso } }

const TIPO_LABEL: Record<string, string> = {
  devolucion:  'Devolución',
  operacional: 'Operacional',
  otro:        'Otro',
}
const TIPO_COLOR: Record<string, string> = {
  devolucion:  'bg-red-100 text-red-700 border border-red-300',
  operacional: 'bg-orange-100 text-orange-700 border border-orange-300',
  otro:        'bg-slate-100 text-slate-600 border border-slate-300',
}

const btnPrimary   = "bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-blue-900 transition"
const btnSecondary = "bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 transition"
const inputCls     = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const labelCls     = "block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide"

const EgresosPage = () => {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtroFecha, setFiltroFecha] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin]       = useState('')
  const [mensaje, setMensaje]         = useState('')
  const [error, setError]             = useState('')
  const [form, setForm] = useState({ concepto: '', monto: '', tipo: 'operacional', observaciones: '' })

  const { data: dataEgresos, refetch } = useQuery<GetEgresosRes>(GET_EGRESOS, { fetchPolicy: 'network-only' })
  const { data: dataFecha }            = useQuery<GetEgresosRes>(GET_EGRESOS_POR_FECHA, {
    variables: { fechaInicio, fechaFin },
    skip: !filtroFecha || !fechaInicio || !fechaFin,
    fetchPolicy: 'network-only'
  })
  const [crearEgreso] = useMutation<CrearEgresoRes>(CREAR_EGRESO_MANUAL_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  const egresos = filtroFecha && fechaInicio && fechaFin
    ? (dataFecha?.egresosPorFecha || [])
    : (dataEgresos?.egresos || [])

  const totalEgresos = egresos.reduce((s, e) => s + Number(e.monto), 0)

  const handleCrear = async () => {
    limpiar()
    if (!form.concepto || !form.monto) return mostrar(false, 'Concepto y monto son requeridos')
    try {
      const { data: res } = await crearEgreso({
        variables: {
          concepto: form.concepto, monto: parseFloat(form.monto),
          tipo: form.tipo, observaciones: form.observaciones || null
        }
      })
      if (res?.crearEgresoManual.ok) {
        mostrar(true, res.crearEgresoManual.mensaje)
        setForm({ concepto: '', monto: '', tipo: 'operacional', observaciones: '' })
        setMostrarForm(false); refetch()
      } else mostrar(false, res?.crearEgresoManual.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Egresos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Registro de egresos y devoluciones</p>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); limpiar() }}
          className={mostrarForm ? btnSecondary : btnPrimary}>
          {mostrarForm ? '✕ Cancelar' : '+ Nuevo egreso manual'}
        </button>
      </div>

      {mensaje && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm border border-green-200 font-medium">{mensaje}</div>}
      {error   && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm border border-red-200 font-medium">{error}</div>}

      {/* Formulario nuevo egreso */}
      {mostrarForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4">Nuevo egreso manual</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Concepto *</label>
              <input type="text" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })}
                placeholder="Descripción del egreso" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Monto Bs. *</label>
              <input type="number" step="0.01" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })}
                placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className={inputCls}>
                <option value="operacional">Operacional</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Observaciones</label>
              <input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className={inputCls} />
            </div>
          </div>
          <div className="mt-4">
            <button onClick={handleCrear} className={btnPrimary}>Guardar egreso</button>
          </div>
        </div>
      )}

      {/* Resumen + filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex items-end gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total egresos</p>
          <p className="text-xl font-bold text-red-600">Bs. {totalEgresos.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <input type="checkbox" checked={filtroFecha} onChange={e => setFiltroFecha(e.target.checked)}
            className="w-4 h-4 accent-blue-700" />
          <label className="text-sm font-medium text-slate-600">Filtrar por fecha</label>
        </div>
        {filtroFecha && (
          <>
            <div>
              <label className={labelCls}>Desde</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className={labelCls}>Hasta</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
          </>
        )}
        <div className="ml-auto text-xs text-slate-400">{egresos.length} registro(s)</div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left border-b border-slate-200">Concepto</th>
              <th className="px-4 py-3 text-left border-b border-slate-200">Tipo</th>
              <th className="px-4 py-3 text-left border-b border-slate-200">Referencia</th>
              <th className="px-4 py-3 text-right border-b border-slate-200">Monto</th>
              <th className="px-4 py-3 text-left border-b border-slate-200">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {egresos.map((e, i) => (
              <tr key={e.idEgreso}
                className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-4 py-3 text-xs">{e.concepto}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TIPO_COLOR[e.tipo] || ''}`}>
                    {TIPO_LABEL[e.tipo] || e.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {e.idDevolucion ? `Devolución #${e.idDevolucion}` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-600">Bs. {Number(e.monto).toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(e.fecha).toLocaleDateString('es-BO')}
                </td>
              </tr>
            ))}
            {egresos.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No hay egresos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EgresosPage