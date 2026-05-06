import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_DEVOLUCIONES, GET_DEVOLUCIONES_PENDIENTES } from '../graphql/queries'
import { PROCESAR_DEVOLUCION_MUTATION } from '../graphql/mutations'

interface Cliente    { nombreCompleto: string; nroDocumento: string }
interface Asiento    { numero: string; clase: string }
interface Devolucion {
  idDevolucion: string; motivo: string
  porcentajeReembolso: number; montoOriginal: number; montoReembolso: number
  estado: string; observaciones: string
  fechaSolicitud: string; fechaProcesado: string
  idTicket: {
    idTicket: string; codigoTicket: string
    idReserva: {
      codigoReserva: string
      idCliente: Cliente
      idAsientoVuelo: {
        idAsiento: Asiento
        idProgramacion: {
          codigoVuelo: string
          idRuta: { idAeropuertoOrigen: { codigo: string }; idAeropuertoDestino: { codigo: string } }
        }
      }
    }
  }
}

interface GetDevolucionesRes { devoluciones: Devolucion[]; devolucionesPendientes: Devolucion[] }
interface ProcesarDevolucionRes { procesarDevolucion: { ok: boolean; mensaje: string } }

const MOTIVO_LABEL: Record<string, string> = {
  cliente_cancela: 'Cliente cancela',
  meteorologia:    'Meteorología (BOA)',
  falta_cupos:     'Falta de cupos (BOA)',
  administracion:  'Administración (BOA)',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700 border border-yellow-300',
  procesada:  'bg-green-100 text-green-700 border border-green-300',
  rechazada:  'bg-red-100 text-red-700 border border-red-300',
}
const CLASE_LABEL: Record<string, string> = {
  economica: 'Económica', economica_premium: 'Econ. Premium',
  ejecutiva: 'Ejecutiva', primera_clase: 'Primera Clase',
}

const btnPrimary   = "bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-blue-900 transition"
const btnSecondary = "bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 transition"
const inputCls     = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const labelCls     = "block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide"

const DevolucionesPage = () => {
  const [vista, setVista]               = useState<'pendientes' | 'todas'>('pendientes')
  const [mensaje, setMensaje]           = useState('')
  const [error, setError]               = useState('')
  const [devSel, setDevSel]             = useState<Devolucion | null>(null)
  const [obsForm, setObsForm]           = useState('')

  const { data: dataPend, refetch: refetchPend } = useQuery<GetDevolucionesRes>(
    GET_DEVOLUCIONES_PENDIENTES, { fetchPolicy: 'network-only' }
  )
  const { data: dataTodas, refetch: refetchTodas } = useQuery<GetDevolucionesRes>(
    GET_DEVOLUCIONES, { fetchPolicy: 'network-only' }
  )
  const [procesarDevolucion] = useMutation<ProcesarDevolucionRes>(PROCESAR_DEVOLUCION_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  const devoluciones = vista === 'pendientes'
    ? (dataPend?.devolucionesPendientes || [])
    : (dataTodas?.devoluciones || [])

  const handleProcesar = async () => {
    if (!devSel) return
    limpiar()
    try {
      const { data: res } = await procesarDevolucion({
        variables: { idDevolucion: parseInt(devSel.idDevolucion), observaciones: obsForm || null }
      })
      if (res?.procesarDevolucion.ok) {
        mostrar(true, res.procesarDevolucion.mensaje)
        setDevSel(null); setObsForm('')
        refetchPend(); refetchTodas()
      } else mostrar(false, res?.procesarDevolucion.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Devoluciones</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestión de reembolsos de pasajes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setVista('pendientes')}
            className={vista === 'pendientes' ? btnPrimary : btnSecondary}>
            Pendientes
            {(dataPend?.devolucionesPendientes || []).length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {(dataPend?.devolucionesPendientes || []).length}
              </span>
            )}
          </button>
          <button onClick={() => setVista('todas')}
            className={vista === 'todas' ? btnPrimary : btnSecondary}>
            Todas
          </button>
        </div>
      </div>

      {mensaje && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm border border-green-200 font-medium">{mensaje}</div>}
      {error   && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm border border-red-200 font-medium">{error}</div>}

      <div className="flex gap-6">
        {/* Tabla devoluciones */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left border-b border-slate-200">Ticket</th>
                <th className="px-4 py-3 text-left border-b border-slate-200">Pasajero</th>
                <th className="px-4 py-3 text-left border-b border-slate-200">Vuelo / Asiento</th>
                <th className="px-4 py-3 text-left border-b border-slate-200">Motivo</th>
                <th className="px-4 py-3 text-center border-b border-slate-200">% Reembolso</th>
                <th className="px-4 py-3 text-right border-b border-slate-200">Monto</th>
                <th className="px-4 py-3 text-left border-b border-slate-200">Estado</th>
                <th className="px-4 py-3 text-left border-b border-slate-200">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {devoluciones.map((d, i) => (
                <tr key={d.idDevolucion}
                  onClick={() => { setDevSel(d); setObsForm(''); limpiar() }}
                  className={`border-b border-slate-100 cursor-pointer transition ${
                    devSel?.idDevolucion === d.idDevolucion
                      ? 'bg-blue-50 border-l-4 border-l-blue-700'
                      : i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'
                  }`}>
                  <td className="px-4 py-3 font-bold text-blue-800 text-xs">{d.idTicket.codigoTicket}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.idTicket.idReserva.idCliente.nombreCompleto}</p>
                    <p className="text-xs text-slate-400">{d.idTicket.idReserva.idCliente.nroDocumento}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{d.idTicket.idReserva.idAsientoVuelo.idProgramacion.codigoVuelo}</p>
                    <p className="text-xs text-slate-400">
                      {d.idTicket.idReserva.idAsientoVuelo.idProgramacion.idRuta.idAeropuertoOrigen.codigo} → {d.idTicket.idReserva.idAsientoVuelo.idProgramacion.idRuta.idAeropuertoDestino.codigo}
                      {' — '}
                      {CLASE_LABEL[d.idTicket.idReserva.idAsientoVuelo.idAsiento.clase] || d.idTicket.idReserva.idAsientoVuelo.idAsiento.clase}
                      {' '}
                      {d.idTicket.idReserva.idAsientoVuelo.idAsiento.numero}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">{MOTIVO_LABEL[d.motivo] || d.motivo}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      d.porcentajeReembolso === 0 ? 'bg-red-100 text-red-600 border border-red-300' :
                      d.porcentajeReembolso === 100 ? 'bg-green-100 text-green-700 border border-green-300' :
                      'bg-yellow-100 text-yellow-700 border border-yellow-300'
                    }`}>
                      {d.porcentajeReembolso}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-xs text-slate-400 line-through">Bs. {d.montoOriginal}</p>
                    <p className="font-bold text-green-700">Bs. {d.montoReembolso}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${ESTADO_COLOR[d.estado] || ''}`}>
                      {d.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(d.fechaSolicitud).toLocaleDateString('es-BO')}
                  </td>
                </tr>
              ))}
              {devoluciones.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                  {vista === 'pendientes' ? 'No hay devoluciones pendientes' : 'No hay devoluciones registradas'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Panel procesar */}
        {devSel && devSel.estado === 'pendiente' && (
          <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-fit">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4 pb-2 border-b">
              Procesar devolución
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-200 mb-4">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: 'Ticket',    val: devSel.idTicket.codigoTicket },
                    { label: 'Pasajero',  val: devSel.idTicket.idReserva.idCliente.nombreCompleto },
                    { label: 'Motivo',    val: MOTIVO_LABEL[devSel.motivo] || devSel.motivo },
                    { label: '% Reemb.',  val: `${devSel.porcentajeReembolso}%` },
                    { label: 'Monto orig.', val: `Bs. ${devSel.montoOriginal}` },
                  ].map(({ label, val }) => (
                    <tr key={label} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-xs text-slate-500 bg-slate-50 font-semibold">{label}</td>
                      <td className="px-3 py-2 text-xs font-medium text-right">{val}</td>
                    </tr>
                  ))}
                  <tr className="bg-green-50">
                    <td className="px-3 py-2 text-xs font-bold text-slate-700">A reembolsar</td>
                    <td className="px-3 py-2 text-sm font-bold text-green-700 text-right">Bs. {devSel.montoReembolso}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mb-3">
              <label className={labelCls}>Observaciones</label>
              <textarea value={obsForm} onChange={e => setObsForm(e.target.value)}
                rows={3} placeholder="Notas del proceso..." className={inputCls} />
            </div>
            <button onClick={handleProcesar} className={`w-full ${btnPrimary} py-3`}>
              Confirmar devolución — Bs. {devSel.montoReembolso}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default DevolucionesPage