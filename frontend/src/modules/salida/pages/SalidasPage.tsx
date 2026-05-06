import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_SALIDAS_HOY, GET_SALIDAS, GET_DETALLES_ABORDAJE } from '../graphql/queries'
import { GET_PROGRAMACIONES } from '../../vuelos/graphql/queries'
import {
  ABRIR_SALIDA_MUTATION, MARCAR_ABORDAJE_MUTATION,
  CERRAR_SALIDA_MUTATION, CANCELAR_VUELO_MUTATION,
} from '../graphql/mutations'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Aeropuerto { codigo: string; ciudad: string }
interface Ruta       { idAeropuertoOrigen: Aeropuerto; idAeropuertoDestino: Aeropuerto }
interface Programacion {
  idProgramacion: string; codigoVuelo: string
  fechaSalida: string; horaSalida: string
  fechaLlegada: string; horaLlegada: string
  asientosDisponible: number; asientoVendido: number
  ocupacionMinima: number; estado: string
  idRuta: Ruta
  idAeronave: { codigoAeronave: string; modelo: string }
}
interface Salida {
  idSalida: string; estado: string
  fechaSalidaReal: string; horaSalidaReal: string
  motivoCancelacion: string; observaciones: string
  porcentajeOcupacion: number; cumpleMinimo: boolean
  totalAbordados: number; totalPasajeros: number
  idProgramacion: Programacion
}
interface DetalleAbordaje {
  idDetalle: string; abordado: boolean; horaAbordaje: string
  idReserva: {
    idReserva: string; codigoReserva: string
    idCliente: { idCliente: string; nombreCompleto: string; nroDocumento: string }
    idAsientoVuelo: { idAsiento: { numero: string; clase: string } }
  }
}

const CLASE_LABEL: Record<string, string> = {
  economica: 'Económica', economica_premium: 'Econ. Premium',
  ejecutiva: 'Ejecutiva', primera_clase: 'Primera Clase',
}
const CLASE_COLOR: Record<string, string> = {
  economica:         'bg-slate-100 text-slate-600 border border-slate-300',
  economica_premium: 'bg-blue-100 text-blue-700 border border-blue-300',
  ejecutiva:         'bg-purple-100 text-purple-700 border border-purple-300',
  primera_clase:     'bg-yellow-100 text-yellow-700 border border-yellow-300',
}
const ESTADO_SALIDA_COLOR: Record<string, string> = {
  programada:   'bg-slate-100 text-slate-600 border border-slate-300',
  abordando:    'bg-blue-100 text-blue-700 border border-blue-300',
  cerrada:      'bg-green-100 text-green-700 border border-green-300',
  cancelada:    'bg-red-100 text-red-700 border border-red-300',
  reprogramada: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
}
const MOTIVOS_CANCELACION = [
  { value: 'meteorologia',   label: 'Condiciones meteorológicas (50% reembolso)' },
  { value: 'falta_cupos',    label: 'Falta de cupos mínimos (80% reembolso)' },
  { value: 'administracion', label: 'Decisión administrativa BOA (100% reembolso)' },
]

const inputCls     = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const labelCls     = "block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide"
const btnPrimary   = "bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-blue-900 transition"
const btnSecondary = "bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 transition"
const btnDanger    = "bg-white hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 transition"
const btnSuccess   = "bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-green-800 transition"

// Elemento de la lista — puede ser un vuelo sin salida o una salida existente
interface ItemVuelo {
  tipo: 'sin_salida' | 'con_salida'
  programacion: Programacion
  salida?: Salida
}

const SalidasPage = () => {
  const [vistaActual,       setVistaActual]       = useState<'hoy' | 'todas'>('hoy')
  const [itemSel,           setItemSel]           = useState<ItemVuelo | null>(null)
  const [mensaje,           setMensaje]           = useState('')
  const [error,             setError]             = useState('')
  const [mostrarCancelar,   setMostrarCancelar]   = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [observaciones,     setObservaciones]     = useState('')

  // Queries
  const { data: dataSalidas,  refetch: refetchSalidas }  = useQuery<{ salidasHoy: Salida[]; salidas: Salida[] }>(
    vistaActual === 'hoy' ? GET_SALIDAS_HOY : GET_SALIDAS,
    { fetchPolicy: 'network-only' }
  )
  const { data: dataProgs, refetch: refetchProgs } = useQuery<{ programaciones: Programacion[] }>(
    GET_PROGRAMACIONES, { fetchPolicy: 'network-only' }
  )
  const { data: dataDetalles, refetch: refetchDetalles } = useQuery<{ detallesAbordaje: DetalleAbordaje[] }>(
    GET_DETALLES_ABORDAJE,
    {
      variables: { idSalida: parseInt(itemSel?.salida?.idSalida || '0') },
      skip: !itemSel?.salida,
      fetchPolicy: 'network-only'
    }
  )

  const [abrirSalida]    = useMutation<{ abrirSalida:    { ok: boolean; mensaje: string; salida: Salida } }>(ABRIR_SALIDA_MUTATION)
  const [marcarAbordaje] = useMutation<{ marcarAbordaje: { ok: boolean; mensaje: string } }>(MARCAR_ABORDAJE_MUTATION)
  const [cerrarSalida]   = useMutation<{ cerrarSalida:   { ok: boolean; mensaje: string } }>(CERRAR_SALIDA_MUTATION)
  const [cancelarVuelo]  = useMutation<{ cancelarVuelo:  { ok: boolean; mensaje: string; totalDevoluciones: number } }>(CANCELAR_VUELO_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }
  const refetchTodo = () => { refetchSalidas(); refetchProgs() }

  // Combinar vuelos sin salida + salidas existentes
  const salidas   = (dataSalidas as any)?.[vistaActual === 'hoy' ? 'salidasHoy' : 'salidas'] || []
  const progs     = dataProgs?.programaciones || []
  const hoy       = new Date().toISOString().split('T')[0]

  // IDs de programaciones que ya tienen salida
  const idsConSalida = new Set(salidas.map((s: Salida) => s.idProgramacion.idProgramacion))

  // Vuelos sin salida que deberían aparecer
  const vuelosSinSalida: ItemVuelo[] = progs
    .filter(p => {
      if (!['programado', 'reprogramado'].includes(p.estado)) return false
      if (idsConSalida.has(p.idProgramacion)) return false
      if (vistaActual === 'hoy' && p.fechaSalida !== hoy) return false
      return true
    })
    .map(p => ({ tipo: 'sin_salida' as const, programacion: p }))

  // Salidas existentes
  const vuelosConSalida: ItemVuelo[] = salidas.map((s: Salida) => ({
    tipo: 'con_salida' as const,
    programacion: s.idProgramacion,
    salida: s,
  }))

  const items: ItemVuelo[] = [...vuelosSinSalida, ...vuelosConSalida]
    .sort((a, b) => a.programacion.horaSalida.localeCompare(b.programacion.horaSalida))

  const handleAbrirSalida = async (idProgramacion: string) => {
    limpiar()
    try {
      const { data: res } = await abrirSalida({ variables: { idProgramacion: parseInt(idProgramacion) } })
      if (res?.abrirSalida.ok) {
        mostrar(true, res.abrirSalida.mensaje)
        refetchTodo()
      } else mostrar(false, res?.abrirSalida.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleMarcarAbordaje = async (idDetalle: string, abordado: boolean) => {
    try {
      const { data: res } = await marcarAbordaje({ variables: { idDetalle: parseInt(idDetalle), abordado } })
      if (res?.marcarAbordaje.ok) { refetchDetalles(); refetchSalidas() }
      else mostrar(false, res?.marcarAbordaje.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleCerrarSalida = async () => {
    if (!itemSel?.salida) return; limpiar()
    if (!confirm('¿Confirmar la salida del vuelo? Esta acción registra el despegue.')) return
    try {
      const { data: res } = await cerrarSalida({ variables: { idSalida: parseInt(itemSel.salida.idSalida) } })
      if (res?.cerrarSalida.ok) {
        mostrar(true, res.cerrarSalida.mensaje)
        setItemSel(null); refetchTodo()
      } else mostrar(false, res?.cerrarSalida.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleCancelarVuelo = async () => {
    if (!itemSel || !motivoCancelacion) return; limpiar()
    try {
      const { data: res } = await cancelarVuelo({
        variables: {
          idProgramacion: parseInt(itemSel.programacion.idProgramacion),
          motivoCancelacion, observaciones: observaciones || null,
        }
      })
      if (res?.cancelarVuelo.ok) {
        mostrar(true, res.cancelarVuelo.mensaje)
        setMostrarCancelar(false); setItemSel(null); refetchTodo()
      } else mostrar(false, res?.cancelarVuelo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const detalles   = dataDetalles?.detallesAbordaje || []
  const abordados  = detalles.filter(d => d.abordado).length
  const salida     = itemSel?.salida
  const prog       = itemSel?.programacion

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Salidas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Control de abordaje y salida de vuelos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setVistaActual('hoy'); setItemSel(null) }}
            className={vistaActual === 'hoy' ? btnPrimary : btnSecondary}>Vuelos de hoy</button>
          <button onClick={() => { setVistaActual('todas'); setItemSel(null) }}
            className={vistaActual === 'todas' ? btnPrimary : btnSecondary}>Todos los vuelos</button>
        </div>
      </div>

      {mensaje && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm border border-green-200 font-medium">{mensaje}</div>}
      {error   && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm border border-red-200 font-medium">{error}</div>}

      <div className="flex gap-6">
        {/* Lista de vuelos */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Vuelo</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Ruta</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Fecha / Hora salida</th>
                  <th className="px-4 py-3 text-center border-b border-slate-200">Pasajeros</th>
                  <th className="px-4 py-3 text-center border-b border-slate-200">Ocupación</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Estado</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const p        = item.programacion
                  const s        = item.salida
                  const vendidos = p.asientoVendido
                  const total    = p.asientosDisponible
                  const pct      = total > 0 ? Math.round((vendidos / total) * 100) : 0
                  const cumple   = pct >= p.ocupacionMinima
                  const isSelected = itemSel?.programacion.idProgramacion === p.idProgramacion

                  return (
                    <tr key={p.idProgramacion}
                      onClick={() => { setItemSel(item); limpiar(); setMostrarCancelar(false) }}
                      className={`border-b border-slate-100 cursor-pointer transition ${
                        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-700'
                        : i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'
                      }`}>
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-800">{p.codigoVuelo}</span>
                        {p.estado === 'reprogramado' && (
                          <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded">reprog.</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{p.idRuta.idAeropuertoOrigen.codigo}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="font-medium">{p.idRuta.idAeropuertoDestino.codigo}</span>
                        <div className="text-xs text-slate-400">{p.idRuta.idAeropuertoOrigen.ciudad} → {p.idRuta.idAeropuertoDestino.ciudad}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{p.fechaSalida}</div>
                        <div className="text-xs text-blue-600 font-medium">{p.horaSalida}</div>
                        {s?.fechaSalidaReal && (
                          <div className="text-xs text-green-600">Real: {s.horaSalidaReal}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s ? (
                          <span className="text-sm font-bold">{s.totalAbordados}/{s.totalPasajeros}</span>
                        ) : (
                          <span className="text-sm font-bold">{vendidos}/{total}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-14 bg-slate-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${cumple ? 'bg-green-500' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${cumple ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s ? (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${ESTADO_SALIDA_COLOR[s.estado] || 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
                            {s.estado}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            sin abordaje
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!s && (
                          <button onClick={e => { e.stopPropagation(); handleAbrirSalida(p.idProgramacion) }}
                            className={`${btnPrimary} text-xs py-1.5`}>
                            Abrir abordaje
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                    {vistaActual === 'hoy' ? 'No hay vuelos para hoy' : 'No hay vuelos registrados'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel detalle */}
        {itemSel && prog && (
          <div className="w-96 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 pb-2 border-b">
                {prog.codigoVuelo} — {prog.idRuta.idAeropuertoOrigen.codigo} → {prog.idRuta.idAeropuertoDestino.codigo}
              </h3>

              <div className="overflow-hidden rounded-lg border border-slate-200 mb-4">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { label: 'Fecha salida',  val: `${prog.fechaSalida} ${prog.horaSalida}` },
                      { label: 'Confirmados',   val: `${prog.asientoVendido} pasajeros` },
                      { label: 'Ocupación',     val: `${Math.round((prog.asientoVendido / prog.asientosDisponible) * 100)}%` },
                      { label: 'Mínimo requ.',  val: `${prog.ocupacionMinima}%` },
                      ...(salida ? [
                        { label: 'Abordados', val: `${salida.totalAbordados} / ${salida.totalPasajeros}` },
                        ...(salida.fechaSalidaReal ? [{ label: 'Salida real', val: `${salida.fechaSalidaReal} ${salida.horaSalidaReal}` }] : [])
                      ] : []),
                    ].map(({ label, val }) => (
                      <tr key={label} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-xs text-slate-500 bg-slate-50 font-semibold">{label}</td>
                        <td className="px-3 py-2 text-xs font-medium text-right">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Acciones */}
              <div className="space-y-2">
                {/* Sin salida — abrir abordaje */}
                {!salida && (
                  <button onClick={() => handleAbrirSalida(prog.idProgramacion)}
                    className={`w-full ${btnPrimary}`}>
                    Abrir proceso de abordaje
                  </button>
                )}

                {/* Abordando — cerrar salida o cancelar */}
                {salida?.estado === 'abordando' && (
                  <>
                    <button onClick={handleCerrarSalida} className={`w-full ${btnSuccess}`}>
                      ✈ Confirmar despegue — Registrar salida
                    </button>
                    <button onClick={() => setMostrarCancelar(!mostrarCancelar)}
                      className={`w-full ${btnDanger} py-2`}>
                      ✕ Cancelar vuelo
                    </button>
                  </>
                )}

                {/* Cerrada */}
                {salida?.estado === 'cerrada' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-green-700 font-semibold text-sm">✈ Vuelo en ruta</p>
                    <p className="text-green-600 text-xs mt-1">Salida registrada: {salida.horaSalidaReal}</p>
                  </div>
                )}

                {/* Formulario cancelación */}
                {mostrarCancelar && salida?.estado === 'abordando' && (
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <p className="text-xs font-bold text-red-700 uppercase mb-3">Motivo de cancelación</p>
                    <div className="space-y-2">
                      <div>
                        <label className={labelCls}>Motivo *</label>
                        <select value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} className={inputCls}>
                          <option value="">-- Seleccionar --</option>
                          {MOTIVOS_CANCELACION.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Observaciones</label>
                        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} className={inputCls} />
                      </div>
                      <button onClick={handleCancelarVuelo} disabled={!motivoCancelacion}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-red-700 transition disabled:opacity-50">
                        Confirmar cancelación
                      </button>
                    </div>
                  </div>
                )}

                {/* También se puede cancelar desde sin salida */}
                {!salida && (
                  <button onClick={() => setMostrarCancelar(!mostrarCancelar)}
                    className={`w-full ${btnDanger} py-2`}>
                    ✕ Cancelar vuelo
                  </button>
                )}
                {mostrarCancelar && !salida && (
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <p className="text-xs font-bold text-red-700 uppercase mb-3">Motivo de cancelación</p>
                    <div className="space-y-2">
                      <div>
                        <label className={labelCls}>Motivo *</label>
                        <select value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} className={inputCls}>
                          <option value="">-- Seleccionar --</option>
                          {MOTIVOS_CANCELACION.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Observaciones</label>
                        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} className={inputCls} />
                      </div>
                      <button onClick={handleCancelarVuelo} disabled={!motivoCancelacion}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-red-700 transition disabled:opacity-50">
                        Confirmar cancelación
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de pasajeros — solo cuando hay salida abierta */}
            {salida && (salida.estado === 'abordando' || salida.estado === 'cerrada') && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Pasajeros — {abordados}/{detalles.length} abordados
                  </p>
                  {salida.estado === 'cerrada' && (
                    <span className="text-xs text-green-600 font-semibold">Vuelo cerrado</span>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left border-b border-slate-200">Pasajero</th>
                      <th className="px-3 py-2 text-left border-b border-slate-200">Asiento</th>
                      <th className="px-3 py-2 text-center border-b border-slate-200">Abordó</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d, i) => (
                      <tr key={d.idDetalle}
                        className={`border-b border-slate-100 ${d.abordado ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-xs">{d.idReserva.idCliente.nombreCompleto}</p>
                          <p className="text-xs text-slate-400">{d.idReserva.idCliente.nroDocumento}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CLASE_COLOR[d.idReserva.idAsientoVuelo.idAsiento.clase] || ''}`}>
                            {d.idReserva.idAsientoVuelo.idAsiento.numero}
                            <span className="ml-1 opacity-70">{CLASE_LABEL[d.idReserva.idAsientoVuelo.idAsiento.clase]}</span>
                          </span>
                          {d.horaAbordaje && <p className="text-xs text-green-600 mt-0.5">{d.horaAbordaje}</p>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {salida.estado === 'abordando' ? (
                            <input type="checkbox" checked={d.abordado}
                              onChange={e => handleMarcarAbordaje(d.idDetalle, e.target.checked)}
                              className="w-4 h-4 accent-blue-700 cursor-pointer" />
                          ) : (
                            <span className={`text-xs font-semibold ${d.abordado ? 'text-green-600' : 'text-red-500'}`}>
                              {d.abordado ? '✓' : '✗'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {detalles.length === 0 && (
                      <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-400 text-xs">Sin pasajeros confirmados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SalidasPage