import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react'
import {
  GET_RESERVAS, BUSCAR_CLIENTE,
  GET_CLASES_VUELO, GET_ASIENTOS_VUELO_DISPONIBLES
} from '../graphql/queries'
import { GET_PROGRAMACIONES, GET_AEROPUERTOS, GET_ESCALAS } from '../../vuelos/graphql/queries'
import {
  CREAR_RESERVA_MUTATION, CANCELAR_RESERVA_MUTATION,
  GENERAR_PAGO_QR_MUTATION, CONFIRMAR_PAGO_EFECTIVO_MUTATION,
  CREAR_CLIENTE_MUTATION, CREAR_VENTA_MUTATION,
  CONFIRMAR_PAGO_VENTA_EFECTIVO_MUTATION, CONFIRMAR_PAGO_VENTA_QR_MUTATION,
  EDITAR_RESERVA_MUTATION, CAMBIAR_RESERVA_CONFIRMADA_MUTATION,
  SOLICITAR_REEMBOLSO_MUTATION,
} from '../graphql/mutations'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Aeropuerto   { idAeropuerto: string; codigo: string; ciudad: string; nombre: string }
interface Cliente      { idCliente: string; nombreCompleto: string; nroDocumento: string; tipoDocumento: string }
interface Asiento      { idAsiento: string; numero: string; fila: number; clase: string }
interface AsientoVuelo { idAsientoVuelo: string; estado: string; idAsiento: Asiento }
interface Ruta         { idRuta: string; tipo: string; idAeropuertoOrigen: Aeropuerto; idAeropuertoDestino: Aeropuerto }
interface Escala       { idEscala: string; ciudad: string; orden: number; tiempoDuracion: number; aeropuerto: { codigo: string } }
interface Programacion {
  idProgramacion: string; codigoVuelo: string
  fechaSalida: string; horaSalida: string; fechaLlegada: string; horaLlegada: string
  precioBase: number; estado: string
  asientosDisponible: number; asientoVendido: number
  idRuta: Ruta
  idAeronave: { idAeronave: string; codigoAeronave: string; modelo: string; totalAsientos: number; tipoPasillo: string }
}
interface ClaseResumen { clase: string; total: number; disponibles: number; precioBase: number; precioConOferta: number }
interface Reserva {
  idReserva: string; codigoReserva: string
  fechaReserva: string; fechaPago: string | null; fechaCancelacion: string | null
  canal: string; estado: string
  idCliente: Cliente
  idAsientoVuelo: {
    idAsientoVuelo: string; estado: string; idAsiento: Asiento
    idProgramacion: { idProgramacion: string; codigoVuelo: string; fechaSalida: string; horaSalida: string; idRuta: Ruta }
  }
}
interface PasajeroReserva {
  index: number; tipo: 'adulto' | 'nino'
  clase: string; asiento: AsientoVuelo | null; cliente: Cliente | null
  reservaCreada: { idReserva: string; codigoReserva: string } | null
  precio: number
}

// Grupo de reservas por vuelo
interface GrupoVuelo {
  idProgramacion: string
  codigoVuelo: string
  ruta: string
  fechaSalida: string
  horaSalida: string
  reservas: Reserva[]
  confirmadas: number
  pendientes: number
  canceladas: number
}

// ── Constantes ─────────────────────────────────────────────────────────────
const CLASE_LABEL: Record<string, string> = {
  economica: 'Económica', economica_premium: 'Econ. Premium',
  ejecutiva: 'Ejecutiva', primera_clase: 'Primera Clase',
}
const CLASE_COLOR: Record<string, string> = {
  economica:         'bg-slate-100 text-slate-700 border border-slate-300',
  economica_premium: 'bg-blue-100 text-blue-700 border border-blue-300',
  ejecutiva:         'bg-purple-100 text-purple-700 border border-purple-300',
  primera_clase:     'bg-yellow-100 text-yellow-700 border border-yellow-300',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente:  'bg-yellow-100 text-yellow-700 border border-yellow-300',
  confirmada: 'bg-green-100 text-green-700 border border-green-300',
  cancelada:  'bg-red-100 text-red-700 border border-red-300',
  expirada:   'bg-slate-100 text-slate-500 border border-slate-300',
}
const CANAL_COLOR: Record<string, string> = {
  caja:   'bg-blue-50 text-blue-700 border border-blue-200',
  online: 'bg-purple-50 text-purple-700 border border-purple-200',
}
const DENOMINACIONES = [200, 100, 50, 20, 10, 5, 2, 1]
const CLASES_SIN_REEMBOLSO = ['economica', 'economica_premium']

const inputCls     = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const labelCls     = "block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide"
const btnPrimary   = "bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-blue-900 transition"
const btnSecondary = "bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 transition"
const btnDanger    = "bg-white hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 transition"
const btnSuccess   = "bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-green-800 transition"
const btnWarning   = "bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
const btnInfo      = "bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"

const fmtDateTime = (dt: string | null) => {
  if (!dt) return '—'
  const d = new Date(dt)
  return `${d.toLocaleDateString('es-BO')} ${d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`
}

// ── Dropdown Pasajeros ─────────────────────────────────────────────────────
const SelectorPasajeros = ({ adultos, ninos, onCambiar }: {
  adultos: number; ninos: number
  onCambiar: (adultos: number, ninos: number) => void
}) => {
  const [abierto, setAbierto]       = useState(false)
  const [tmpAdultos, setTmpAdultos] = useState(adultos)
  const [tmpNinos,   setTmpNinos]   = useState(ninos)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleAceptar = () => { onCambiar(tmpAdultos, tmpNinos); setAbierto(false) }
  const total = adultos + ninos

  return (
    <div ref={ref} className="relative">
      <label className={labelCls}>Pasajeros</label>
      <button onClick={() => { setTmpAdultos(adultos); setTmpNinos(ninos); setAbierto(!abierto) }}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-left flex items-center justify-between hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
        <span className="flex items-center gap-2 text-slate-700">👥 {total === 1 ? '1 persona' : `${total} personas`}</span>
        <span className="text-slate-400 text-xs">{abierto ? '▲' : '▼'}</span>
      </button>
      {abierto && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-64 p-4">
          {[
            { label: 'Adultos', sub: '18+ años', val: tmpAdultos, set: setTmpAdultos, min: 1 },
            { label: 'Niños',   sub: '0–17 años', val: tmpNinos, set: setTmpNinos,   min: 0 },
          ].map(({ label, sub, val, set, min }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div><div className="text-sm font-semibold text-slate-800">{label}</div><div className="text-xs text-slate-400">{sub}</div></div>
              <div className="flex items-center gap-3">
                <button onClick={() => set(Math.max(min, val - 1))}
                  className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-600 hover:border-blue-500 hover:text-blue-600 font-bold text-lg transition">−</button>
                <span className="w-5 text-center font-bold text-slate-800">{val}</span>
                <button onClick={() => set(Math.min(9, val + 1))}
                  className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-600 hover:border-blue-500 hover:text-blue-600 font-bold text-lg transition">+</button>
              </div>
            </div>
          ))}
          <button onClick={handleAceptar} className={`w-full mt-3 ${btnPrimary} py-2`}>Aceptar</button>
        </div>
      )}
    </div>
  )
}

// ── Modal billetes ─────────────────────────────────────────────────────────
const ModalBilletes = ({ precio, onConfirmar, onCerrar }: {
  precio: number
  onConfirmar: (montoRecibido: number, billetes: Record<number, number>) => void
  onCerrar: () => void
}) => {
  const [billetes, setBilletes] = useState<Record<number, number>>(Object.fromEntries(DENOMINACIONES.map(d => [d, 0])))
  const totalRecibido = DENOMINACIONES.reduce((sum, d) => sum + d * (billetes[d] || 0), 0)
  const vuelto        = totalRecibido - precio
  const suficiente    = totalRecibido >= precio

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Pago en Efectivo</h3>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 mb-4 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-600">Total a cobrar</span>
          <span className="text-xl font-bold text-blue-800">Bs. {precio.toFixed(2)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {DENOMINACIONES.map(d => (
            <div key={d} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-sm font-bold text-slate-700 w-12">Bs. {d}</span>
              <input type="number" min="0" value={billetes[d] || ''}
                onChange={e => { const n = parseInt(e.target.value) || 0; setBilletes(b => ({ ...b, [d]: n < 0 ? 0 : n })) }}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 pt-3 space-y-1 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total recibido</span>
            <span className={`font-bold ${suficiente ? 'text-green-700' : 'text-red-600'}`}>Bs. {totalRecibido.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Vuelto</span>
            <span className={`font-bold text-lg ${vuelto >= 0 ? 'text-blue-800' : 'text-red-600'}`}>
              {vuelto >= 0 ? `Bs. ${vuelto.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>
        {!suficiente && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 mb-3">⚠ Faltan Bs. {(precio - totalRecibido).toFixed(2)}</div>}
        <div className="flex gap-3">
          <button onClick={onCerrar} className={`flex-1 ${btnSecondary}`}>Cancelar</button>
          <button onClick={() => suficiente && onConfirmar(totalRecibido, billetes)} disabled={!suficiente}
            className={`flex-1 ${suficiente ? btnSuccess : 'bg-slate-200 text-slate-400 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed'}`}>
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Editar/Cambiar ───────────────────────────────────────────────────
const ModalModificarReserva = ({ reserva, modo, onGuardar, onCerrar }: {
  reserva: Reserva; modo: 'editar' | 'cambiar'
  onGuardar: (idAsientoVuelo: string) => void
  onCerrar: () => void
}) => {
  const clase      = reserva.idAsientoVuelo.idAsiento.clase
  const puedeVuelo = !['economica', 'economica_premium'].includes(clase)
  const [claseSel,   setClaseSel]   = useState(clase)
  const [asientoSel, setAsientoSel] = useState<AsientoVuelo | null>(null)

  const { data: dataClases }   = useQuery<{ clasesVuelo: ClaseResumen[] }>(GET_CLASES_VUELO, {
    variables: { idProgramacion: parseInt(reserva.idAsientoVuelo.idProgramacion.idProgramacion) },
    fetchPolicy: 'network-only'
  })
  const { data: dataAsientos } = useQuery<{ asientosVueloClase: AsientoVuelo[] }>(GET_ASIENTOS_VUELO_DISPONIBLES, {
    variables: { idProgramacion: parseInt(reserva.idAsientoVuelo.idProgramacion.idProgramacion), clase: claseSel },
    skip: !claseSel, fetchPolicy: 'network-only'
  })

  const ORDEN = ['economica', 'economica_premium', 'ejecutiva', 'primera_clase']
  const clasesDisponibles = (dataClases?.clasesVuelo || []).filter(c => {
    return ORDEN.indexOf(c.clase) >= ORDEN.indexOf(clase) && c.disponibles > 0
  })

  const asientos = dataAsientos?.asientosVueloClase || []
  const filas: Record<number, AsientoVuelo[]> = {}
  asientos.forEach(av => {
    if (!filas[av.idAsiento.fila]) filas[av.idAsiento.fila] = []
    filas[av.idAsiento.fila].push(av)
  })
  const numFilas = Object.keys(filas).map(Number).sort((a, b) => a - b)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {modo === 'editar' ? 'Editar' : 'Cambiar'} reserva — {reserva.codigoReserva}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {reserva.idCliente.nombreCompleto} · Actual: {CLASE_LABEL[clase]} · Asiento {reserva.idAsientoVuelo.idAsiento.numero}
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          {!puedeVuelo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              ⚠ Clase económica — solo puede subir de clase dentro del mismo vuelo
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Seleccionar clase</p>
            <div className="flex gap-2 flex-wrap">
              {clasesDisponibles.map(c => (
                <button key={c.clase} onClick={() => { setClaseSel(c.clase); setAsientoSel(null) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    claseSel === c.clase ? 'bg-blue-800 text-white border-blue-900' : `${CLASE_COLOR[c.clase]} hover:opacity-80`
                  }`}>
                  {CLASE_LABEL[c.clase]} — Bs. {c.precioConOferta} ({c.disponibles} disp.)
                </button>
              ))}
            </div>
          </div>
          {claseSel && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Seleccionar asiento</p>
              {asientoSel && (
                <div className="mb-2 bg-blue-50 border border-blue-200 rounded px-3 py-1.5 text-sm text-blue-800 font-semibold flex justify-between">
                  <span>✓ Asiento {asientoSel.idAsiento.numero}</span>
                  <button onClick={() => setAsientoSel(null)} className="text-xs text-slate-400 hover:text-red-500">cambiar</button>
                </div>
              )}
              <div className="overflow-x-auto bg-slate-50 rounded-lg p-3 space-y-1">
                {numFilas.map(nFila => {
                  const ordenados = [...(filas[nFila] || [])].sort((a, b) => a.idAsiento.numero.slice(-1).localeCompare(b.idAsiento.numero.slice(-1)))
                  return (
                    <div key={nFila} className="flex items-center gap-1">
                      <div className="w-7 text-center text-xs text-slate-400">{nFila}</div>
                      {ordenados.map(av => {
                        const disponible  = av.estado === 'disponible'
                        const seleccionado = asientoSel?.idAsientoVuelo === av.idAsientoVuelo
                        return (
                          <button key={av.idAsientoVuelo} onClick={() => disponible && setAsientoSel(av)}
                            disabled={!disponible} title={av.idAsiento.numero}
                            className={`w-9 h-9 rounded-t-lg text-xs font-bold border-2 transition-all ${
                              seleccionado ? 'bg-blue-700 text-white border-blue-900 scale-110 shadow-lg'
                              : disponible  ? 'bg-green-50 text-green-700 border-green-400 hover:bg-green-100'
                              : 'bg-red-50 text-red-300 border-red-200 cursor-not-allowed opacity-50'
                            }`}>
                            {av.idAsiento.numero}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-200">
          <button onClick={onCerrar} className={`flex-1 ${btnSecondary}`}>Cancelar</button>
          <button onClick={() => asientoSel && onGuardar(asientoSel.idAsientoVuelo)} disabled={!asientoSel}
            className={`flex-1 ${asientoSel ? btnPrimary : 'bg-slate-200 text-slate-400 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed'}`}>
            Confirmar cambio
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Reembolso ────────────────────────────────────────────────────────
const ModalReembolso = ({ reserva, onCerrar, onIrDevoluciones }: {
  reserva: Reserva; onCerrar: () => void
  onIrDevoluciones: (datos: any) => void
}) => {
  const [resultado, setResultado] = useState<any>(null)
  const [solicitarReembolso]      = useMutation<{ solicitarReembolso: any }>(SOLICITAR_REEMBOLSO_MUTATION)

  useEffect(() => {
    solicitarReembolso({ variables: { idReserva: parseInt(reserva.idReserva) } })
      .then(({ data }) => setResultado(data?.solicitarReembolso))
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Solicitud de Reembolso</h3>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-500 space-y-1">
          <div><span className="font-semibold">Reserva:</span> {reserva.codigoReserva}</div>
          <div><span className="font-semibold">Pasajero:</span> {reserva.idCliente.nombreCompleto}</div>
          <div><span className="font-semibold">Vuelo:</span> {reserva.idAsientoVuelo.idProgramacion.codigoVuelo}</div>
          <div><span className="font-semibold">Clase:</span> {CLASE_LABEL[reserva.idAsientoVuelo.idAsiento.clase]}</div>
        </div>
        {!resultado && <p className="text-sm text-slate-400 text-center py-4">Verificando condiciones...</p>}
        {resultado && (
          resultado.ok ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-bold text-green-800">✅ Reembolso aprobado</p>
                <p className="text-green-700 text-sm mt-1">{resultado.motivoCancelacion}</p>
                <div className="flex justify-between mt-3">
                  <span className="text-sm text-green-700">Porcentaje</span>
                  <span className="font-bold text-green-800">{resultado.porcentaje}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">Monto a devolver</span>
                  <span className="font-bold text-green-800 text-lg">Bs. {resultado.montoReembolso}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={onCerrar} className={`flex-1 ${btnSecondary}`}>Cancelar</button>
                <button onClick={() => onIrDevoluciones({
                  codigoReserva: reserva.codigoReserva,
                  pasajero: reserva.idCliente.nombreCompleto,
                  vuelo: reserva.idAsientoVuelo.idProgramacion.codigoVuelo,
                  porcentaje: resultado.porcentaje,
                  monto: resultado.montoReembolso,
                })} className={`flex-1 ${btnSuccess}`}>
                  Ir a Devoluciones →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-bold text-red-700">❌ Sin derecho a reembolso</p>
                <p className="text-red-600 text-sm mt-1">{resultado.mensaje}</p>
              </div>
              <button onClick={onCerrar} className={`w-full ${btnSecondary}`}>Cerrar</button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── Mapa de asientos ───────────────────────────────────────────────────────
const MapaAsientos = ({ asientos, asientoSel, asientosOcupados, tipoPasillo, onSeleccionar }: {
  asientos: AsientoVuelo[]; asientoSel: AsientoVuelo | null
  asientosOcupados: string[]; tipoPasillo: string
  onSeleccionar: (av: AsientoVuelo) => void
}) => {
  const letras = tipoPasillo === 'doble' ? ['A','B','C','D','E','F','G','H','J','K'] : ['A','B','C','D','E','F']
  const mitad  = tipoPasillo === 'doble' ? 4 : 3
  const filas: Record<number, AsientoVuelo[]> = {}
  asientos.forEach(av => {
    if (!filas[av.idAsiento.fila]) filas[av.idAsiento.fila] = []
    filas[av.idAsiento.fila].push(av)
  })
  const numFilas = Object.keys(filas).map(Number).sort((a, b) => a - b)

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-1 mb-2 pl-8">
        {letras.slice(0, mitad).map(l => <div key={l} className="w-9 text-center text-xs text-slate-400 font-semibold">{l}</div>)}
        <div className="w-6" />
        {letras.slice(mitad).map(l => <div key={l} className="w-9 text-center text-xs text-slate-400 font-semibold">{l}</div>)}
      </div>
      <div className="space-y-1">
        {numFilas.map(nFila => {
          const ordenados = [...(filas[nFila] || [])].sort((a, b) => a.idAsiento.numero.slice(-1).localeCompare(b.idAsiento.numero.slice(-1)))
          const izq = ordenados.slice(0, mitad)
          const der = ordenados.slice(mitad)
          const render = (av: AsientoVuelo) => {
            const yaElegido  = asientosOcupados.includes(av.idAsientoVuelo)
            const disponible = av.estado === 'disponible' && !yaElegido
            const sel        = asientoSel?.idAsientoVuelo === av.idAsientoVuelo
            return (
              <button key={av.idAsientoVuelo} onClick={() => disponible && onSeleccionar(av)}
                disabled={!disponible} title={av.idAsiento.numero}
                className={`w-9 h-9 rounded-t-lg text-xs font-bold border-2 transition-all ${
                  sel        ? 'bg-blue-700 text-white border-blue-900 scale-110 shadow-lg'
                  : yaElegido ? 'bg-amber-100 text-amber-600 border-amber-400 cursor-not-allowed'
                  : disponible ? 'bg-green-50 text-green-700 border-green-400 hover:bg-green-100 hover:scale-105'
                  : 'bg-red-50 text-red-300 border-red-200 cursor-not-allowed opacity-50'
                }`}>
                {av.idAsiento.numero}
              </button>
            )
          }
          return (
            <div key={nFila} className="flex items-center gap-1">
              <div className="w-7 text-center text-xs text-slate-400">{nFila}</div>
              {izq.map(render)}
              <div className="w-6 flex items-center justify-center"><div className="h-8 w-px bg-slate-200" /></div>
              {der.map(render)}
            </div>
          )
        })}
      </div>
      <div className="flex gap-4 mt-4 pt-3 border-t border-slate-200 flex-wrap">
        <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-5 h-5 rounded border-2 border-green-400 bg-green-50 inline-block" /> Disponible</span>
        <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-5 h-5 rounded border-2 border-red-200 bg-red-50 inline-block" /> Ocupado</span>
        <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-5 h-5 rounded border-2 border-amber-400 bg-amber-100 inline-block" /> Ya elegido</span>
        <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-5 h-5 rounded border-2 border-blue-900 bg-blue-700 inline-block" /> Seleccionado</span>
      </div>
    </div>
  )
}

const PasoHeader = ({ numero, titulo, completado }: { numero: number; titulo: string; completado?: boolean }) => (
  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${
      completado ? 'bg-green-600 border-green-700 text-white' : 'bg-blue-800 border-blue-900 text-white'
    }`}>{completado ? '✓' : numero}</span>
    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{titulo}</h3>
  </div>
)

// ── Formulario por pasajero ────────────────────────────────────────────────
const FormPasajero = ({ index, tipo, progSel, dataClases, dataAsientos, asientosYaElegidos,
  onGuardar, onCancelar, buscarClienteFn, crearClienteFn, onClaseChange }: {
  index: number; tipo: 'adulto' | 'nino'
  progSel: Programacion; dataClases: ClaseResumen[]
  dataAsientos: AsientoVuelo[]; asientosYaElegidos: string[]
  onGuardar: (p: Omit<PasajeroReserva, 'reservaCreada'>) => void
  onCancelar: () => void
  buscarClienteFn: (doc: string) => Promise<Cliente | null>
  crearClienteFn: (data: any) => Promise<Cliente | null>
  onClaseChange: (clase: string) => void
}) => {
  const [claseSel,    setClaseSel]    = useState('')
  const [asientoSel,  setAsientoSel]  = useState<AsientoVuelo | null>(null)
  const [clienteSel,  setClienteSel]  = useState<Cliente | null>(null)
  const [busqDoc,     setBusqDoc]     = useState('')
  const [buscando,    setBuscando]    = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [errLocal,    setErrLocal]    = useState('')
  const [formCliente, setFormCliente] = useState({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    tipoDocumento: 'ci', nroDocumento: '', correo: '', telefono: '', nacionalidad: 'boliviana'
  })
  const precio = dataClases.find(c => c.clase === claseSel)?.precioConOferta || 0
  const listo  = claseSel && asientoSel && clienteSel

  const handleBuscar = async () => {
    if (!busqDoc.trim()) return
    setBuscando(true); setErrLocal('')
    const cliente = await buscarClienteFn(busqDoc.trim())
    setBuscando(false)
    if (cliente) { setClienteSel(cliente); setMostrarForm(false) }
    else setErrLocal('No encontrado. Regístralo con "+ Nuevo"')
  }

  const handleCrear = async () => {
    if (!formCliente.nombre || !formCliente.apellidoPaterno || !formCliente.nroDocumento) {
      setErrLocal('Nombre, apellido paterno y documento son requeridos'); return
    }
    const cliente = await crearClienteFn(formCliente)
    if (cliente) { setClienteSel(cliente); setMostrarForm(false); setErrLocal('') }
  }

  return (
    <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-blue-800 text-white text-xs font-bold flex items-center justify-center">{index + 1}</span>
          <span className="text-sm font-bold text-slate-800">Pasajero {index + 1} — <span className="capitalize text-blue-700">{tipo}</span></span>
        </div>
        <button onClick={onCancelar} className="text-slate-400 hover:text-red-500 text-sm">✕ Quitar</button>
      </div>
      {errLocal && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 mb-3">{errLocal}</div>}
      <div className="mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">1. Seleccionar clase</p>
        <div className="flex gap-2 flex-wrap">
          {dataClases.map(c => (
            <button key={c.clase} onClick={() => { setClaseSel(c.clase); setAsientoSel(null); onClaseChange(c.clase) }}
              disabled={c.disponibles === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                claseSel === c.clase ? 'bg-blue-800 text-white border-blue-900'
                : c.disponibles > 0 ? `${CLASE_COLOR[c.clase]} hover:opacity-80`
                : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
              }`}>
              {CLASE_LABEL[c.clase]} — Bs. {c.precioConOferta}{c.disponibles === 0 && ' (lleno)'}
            </button>
          ))}
        </div>
      </div>
      {claseSel && (
        <div className="mb-3 bg-white rounded-lg p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">2. Seleccionar asiento</p>
          {asientoSel && (
            <div className="mb-2 bg-blue-50 border border-blue-200 rounded px-3 py-1.5 text-sm text-blue-800 font-semibold flex justify-between items-center">
              <span>✓ Asiento {asientoSel.idAsiento.numero}</span>
              <button onClick={() => setAsientoSel(null)} className="text-xs text-slate-400 hover:text-red-500">cambiar</button>
            </div>
          )}
          <MapaAsientos asientos={dataAsientos} asientoSel={asientoSel} asientosOcupados={asientosYaElegidos}
            tipoPasillo={progSel.idAeronave.tipoPasillo || 'simple'}
            onSeleccionar={av => setAsientoSel(av)} />
        </div>
      )}
      {claseSel && asientoSel && (
        <div className="mb-3 bg-white rounded-lg p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">3. Datos del pasajero</p>
          {!clienteSel ? (
            <>
              <div className="flex gap-2 mb-2">
                <input type="text" value={busqDoc} placeholder="Nro. CI o Pasaporte"
                  onChange={e => setBusqDoc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                  className={inputCls} />
                <button onClick={handleBuscar} disabled={buscando} className={btnPrimary}>{buscando ? '...' : 'Buscar'}</button>
                <button onClick={() => setMostrarForm(!mostrarForm)} className={`${btnSecondary} whitespace-nowrap`}>{mostrarForm ? '✕' : '+ Nuevo'}</button>
              </div>
              {mostrarForm && (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[
                      { label: 'Nombre *', key: 'nombre' }, { label: 'Ap. Paterno *', key: 'apellidoPaterno' },
                      { label: 'Ap. Materno', key: 'apellidoMaterno' }, { label: 'Nro. Doc. *', key: 'nroDocumento' },
                      { label: 'Correo', key: 'correo' }, { label: 'Teléfono', key: 'telefono' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="block text-xs text-slate-500 mb-0.5">{label}</label>
                        <input type="text" value={(formCliente as any)[key]}
                          onChange={e => setFormCliente({ ...formCliente, [key]: e.target.value })}
                          className={inputCls} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Tipo Doc.</label>
                      <select value={formCliente.tipoDocumento} onChange={e => setFormCliente({ ...formCliente, tipoDocumento: e.target.value })} className={inputCls}>
                        <option value="ci">CI</option><option value="pasaporte">Pasaporte</option><option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">Nacionalidad</label>
                      <input type="text" value={formCliente.nacionalidad} onChange={e => setFormCliente({ ...formCliente, nacionalidad: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  <button onClick={handleCrear} className={`text-xs ${btnPrimary}`}>Registrar</button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center justify-between">
              <div>
                <p className="font-bold text-green-800 text-sm">{clienteSel.nombreCompleto}</p>
                <p className="text-green-600 text-xs">{clienteSel.tipoDocumento.toUpperCase()}: {clienteSel.nroDocumento}</p>
              </div>
              <button onClick={() => { setClienteSel(null); setBusqDoc('') }} className={btnDanger}>Cambiar</button>
            </div>
          )}
        </div>
      )}
      {listo && (
        <button onClick={() => onGuardar({ index, tipo, clase: claseSel, asiento: asientoSel!, cliente: clienteSel!, precio })}
          className={`w-full ${btnPrimary} py-2`}>✓ Confirmar pasajero {index + 1}</button>
      )}
    </div>
  )
}

// ── Fila de reserva individual (dentro del grupo) ──────────────────────────
const FilaReserva = ({ r, onEditar, onCancelar, onCambiar, onReembolso }: {
  r: Reserva
  onEditar:   (r: Reserva) => void
  onCancelar: (id: string) => void
  onCambiar:  (r: Reserva) => void
  onReembolso:(r: Reserva) => void
}) => {
  const clase = r.idAsientoVuelo.idAsiento.clase
  const tieneReembolso = !CLASES_SIN_REEMBOLSO.includes(clase)
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-2.5 pl-10 font-medium text-blue-700 text-xs">{r.codigoReserva}</td>
      <td className="px-4 py-2.5">
        <div className="text-xs font-medium">{r.idCliente.nombreCompleto}</div>
        <div className="text-xs text-slate-400">{r.idCliente.nroDocumento}</div>
      </td>
      <td className="px-4 py-2.5">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CLASE_COLOR[clase] || 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
          {r.idAsientoVuelo.idAsiento.numero} — {CLASE_LABEL[clase] || clase}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CANAL_COLOR[r.canal] || 'bg-slate-100 text-slate-600'}`}>
          {r.canal === 'caja' ? 'Caja' : 'Online'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDateTime(r.fechaReserva)}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">
        {r.estado === 'confirmada' ? fmtDateTime(r.fechaPago)
          : r.estado === 'cancelada' ? <span className="text-red-400">{fmtDateTime(r.fechaCancelacion)}</span>
          : '—'}
      </td>
      <td className="px-4 py-2.5">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ESTADO_COLOR[r.estado] || 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
          {r.estado}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex gap-1 flex-wrap">
          {r.estado === 'pendiente' && (
            <>
              <button onClick={() => onEditar(r)} className={btnInfo}>Editar</button>
              <button onClick={() => onCancelar(r.idReserva)} className={btnDanger}>Cancelar</button>
            </>
          )}
          {r.estado === 'confirmada' && (
            <button onClick={() => onCambiar(r)} className={btnWarning}>Cambiar</button>
          )}
          {r.estado === 'cancelada' && tieneReembolso && (
            <button onClick={() => onReembolso(r)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">
              Reembolso
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Fila de grupo (vuelo) ──────────────────────────────────────────────────
const FilaGrupo = ({ grupo, expandido, onToggle, onEditar, onCancelar, onCambiar, onReembolso }: {
  grupo: GrupoVuelo; expandido: boolean; onToggle: () => void
  onEditar: (r: Reserva) => void; onCancelar: (id: string) => void
  onCambiar: (r: Reserva) => void; onReembolso: (r: Reserva) => void
}) => (
  <>
    {/* Fila cabecera del vuelo */}
    <tr onClick={onToggle}
      className="cursor-pointer bg-slate-50 hover:bg-blue-50 border-b border-slate-200 transition">
      <td className="px-4 py-3" colSpan={2}>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs font-bold">{expandido ? '▼' : '▶'}</span>
          <span className="font-bold text-blue-800">{grupo.codigoVuelo}</span>
          <span className="text-slate-600 text-sm">{grupo.ruta}</span>
          <span className="text-slate-400 text-xs">{grupo.fechaSalida} {grupo.horaSalida}</span>
        </div>
      </td>
      <td className="px-4 py-3" colSpan={3}>
        <div className="flex items-center gap-3">
          <span className="bg-green-100 text-green-700 border border-green-300 px-2 py-0.5 rounded text-xs font-semibold">
            {grupo.confirmadas} confirmadas
          </span>
          {grupo.pendientes > 0 && (
            <span className="bg-yellow-100 text-yellow-700 border border-yellow-300 px-2 py-0.5 rounded text-xs font-semibold">
              {grupo.pendientes} pendientes
            </span>
          )}
          {grupo.canceladas > 0 && (
            <span className="bg-red-100 text-red-600 border border-red-300 px-2 py-0.5 rounded text-xs font-semibold">
              {grupo.canceladas} canceladas
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right" colSpan={3}>
        <span className="text-xs text-slate-400">{grupo.reservas.length} reserva{grupo.reservas.length !== 1 ? 's' : ''} en total</span>
      </td>
    </tr>
    {/* Filas de reservas individuales */}
    {expandido && grupo.reservas.map(r => (
      <FilaReserva key={r.idReserva} r={r}
        onEditar={onEditar} onCancelar={onCancelar}
        onCambiar={onCambiar} onReembolso={onReembolso} />
    ))}
  </>
)

// ── Página principal ───────────────────────────────────────────────────────
const ReservasPage = ({ onNavegar }: { onNavegar?: (p: any) => void }) => {
  const [modo, setModo]       = useState<'lista' | 'nueva'>('lista')
  const [mensaje, setMensaje] = useState('')
  const [error, setError]     = useState('')
  const [mostrarModalBilletes,  setMostrarModalBilletes]  = useState(false)
  const [reservaModificar,      setReservaModificar]      = useState<{ reserva: Reserva; modo: 'editar' | 'cambiar' } | null>(null)
  const [reservaReembolso,      setReservaReembolso]      = useState<Reserva | null>(null)
  const [gruposExpandidos,      setGruposExpandidos]      = useState<Set<string>>(new Set())

  // Filtros lista
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCanal,  setFiltroCanal]  = useState('')

  // Filtros vuelo (nueva reserva)
  const [filtroOrigen,  setFiltroOrigen]  = useState('')
  const [filtroDestino, setFiltroDestino] = useState('')
  const [filtroFecha,   setFiltroFecha]   = useState('')

  // Pasajeros
  const [adultos, setAdultos] = useState(1)
  const [ninos,   setNinos]   = useState(0)
  const totalPasajeros = adultos + ninos

  // Estado nueva reserva
  const [progSel,             setProgSel]             = useState<Programacion | null>(null)
  const [pasajeros,           setPasajeros]           = useState<PasajeroReserva[]>([])
  const [pasajeroActivo,      setPasajeroActivo]      = useState<number>(-1)
  const [clasePasajeroActivo, setClasePasajeroActivo] = useState('')
  const [ventaId,             setVentaId]             = useState<string | null>(null)
  const [pagoData,            setPagoData]            = useState<{ urlPago: string; qrUrl: string } | null>(null)

  // Queries
  const { data: dataReservas, refetch } = useQuery<{ reservas: Reserva[] }>(GET_RESERVAS, { fetchPolicy: 'network-only' })
  const { data: dataProgs }             = useQuery<{ programaciones: Programacion[] }>(GET_PROGRAMACIONES, { fetchPolicy: 'network-only' })
  const { data: dataAeropuertos }       = useQuery<{ aeropuertos: Aeropuerto[] }>(GET_AEROPUERTOS, { fetchPolicy: 'network-only' })
  const { data: dataClases }            = useQuery<{ clasesVuelo: ClaseResumen[] }>(GET_CLASES_VUELO, {
    variables: { idProgramacion: parseInt(progSel?.idProgramacion || '0') },
    skip: !progSel, fetchPolicy: 'network-only'
  })
  const { data: dataAsientos } = useQuery<{ asientosVueloClase: AsientoVuelo[] }>(GET_ASIENTOS_VUELO_DISPONIBLES, {
    variables: { idProgramacion: parseInt(progSel?.idProgramacion || '0'), clase: clasePasajeroActivo },
    skip: !progSel || !clasePasajeroActivo, fetchPolicy: 'network-only'
  })
  const { data: dataEscalas } = useQuery<{ escalas: Escala[] }>(GET_ESCALAS, {
    variables: { idRuta: progSel ? parseInt(progSel.idRuta.idRuta) : null },
    skip: !progSel, fetchPolicy: 'network-only'
  })

  const [buscarClienteGQL]       = useLazyQuery<{ buscarCliente: Cliente | null }>(BUSCAR_CLIENTE)
  const [crearClienteGQL]        = useMutation<{ crearCliente: { ok: boolean; mensaje: string; cliente: Cliente } }>(CREAR_CLIENTE_MUTATION)
  const [crearVenta]             = useMutation<{ crearVenta: { ok: boolean; venta: { idVenta: string } } }>(CREAR_VENTA_MUTATION)
  const [crearReserva]           = useMutation<{ crearReserva: { ok: boolean; mensaje: string; reserva: { idReserva: string; codigoReserva: string } } }>(CREAR_RESERVA_MUTATION)
  const [cancelarReserva]        = useMutation<{ cancelarReserva: { ok: boolean; mensaje: string } }>(CANCELAR_RESERVA_MUTATION)
  const [editarReserva]          = useMutation<{ editarReserva: { ok: boolean; mensaje: string } }>(EDITAR_RESERVA_MUTATION)
  const [cambiarReserva]         = useMutation<{ cambiarReservaConfirmada: { ok: boolean; mensaje: string; diferencia: number; requierePago: boolean } }>(CAMBIAR_RESERVA_CONFIRMADA_MUTATION)
  const [generarPagoQR]          = useMutation<{ generarPagoQr: { ok: boolean; mensaje: string; urlPago: string; qrUrl: string } }>(GENERAR_PAGO_QR_MUTATION)
  const [confirmarEfectivo]      = useMutation<{ confirmarPagoEfectivo: { ok: boolean; mensaje: string; vuelto: number } }>(CONFIRMAR_PAGO_EFECTIVO_MUTATION)
  const [confirmarVentaEfectivo] = useMutation<{ confirmarPagoVentaEfectivo: { ok: boolean; mensaje: string; vuelto: number } }>(CONFIRMAR_PAGO_VENTA_EFECTIVO_MUTATION)
  const [confirmarVentaQR]       = useMutation<{ confirmarPagoVentaQr: { ok: boolean; mensaje: string; urlPago: string; qrUrl: string } }>(CONFIRMAR_PAGO_VENTA_QR_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  const escalas = [...(dataEscalas?.escalas || [])].sort((a, b) => a.orden - b.orden)

  const vuelosFiltrados = (dataProgs?.programaciones || []).filter(p => {
    if (!['programado', 'reprogramado'].includes(p.estado.toLowerCase())) return false
    if (filtroOrigen  && p.idRuta.idAeropuertoOrigen.idAeropuerto  !== filtroOrigen)  return false
    if (filtroDestino && p.idRuta.idAeropuertoDestino.idAeropuerto !== filtroDestino) return false
    if (filtroFecha   && p.fechaSalida !== filtroFecha) return false
    return true
  })

  // Agrupar reservas por vuelo
  const gruposMap = new Map<string, GrupoVuelo>()
  const todasReservas = dataReservas?.reservas || []

  todasReservas.forEach(r => {
    const idProg = r.idAsientoVuelo.idProgramacion.idProgramacion
    // Aplicar filtros
    if (filtroEstado && r.estado !== filtroEstado) return
    if (filtroCanal  && r.canal  !== filtroCanal)  return

    if (!gruposMap.has(idProg)) {
      const prog = r.idAsientoVuelo.idProgramacion
      gruposMap.set(idProg, {
        idProgramacion: idProg,
        codigoVuelo:    prog.codigoVuelo,
        ruta:           `${prog.idRuta.idAeropuertoOrigen.codigo} → ${prog.idRuta.idAeropuertoDestino.codigo}`,
        fechaSalida:    prog.fechaSalida,
        horaSalida:     prog.horaSalida,
        reservas:       [],
        confirmadas:    0,
        pendientes:     0,
        canceladas:     0,
      })
    }
    const grupo = gruposMap.get(idProg)!
    grupo.reservas.push(r)
    if (r.estado === 'confirmada') grupo.confirmadas++
    else if (r.estado === 'pendiente') grupo.pendientes++
    else if (r.estado === 'cancelada') grupo.canceladas++
  })

  const grupos = Array.from(gruposMap.values())
    .sort((a, b) => b.fechaSalida.localeCompare(a.fechaSalida))

  const toggleGrupo = (idProg: string) => {
    setGruposExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(idProg)) next.delete(idProg)
      else next.add(idProg)
      return next
    })
  }

  const asientosYaElegidos   = pasajeros.filter(p => p.asiento !== null).map(p => p.asiento!.idAsientoVuelo)
  const totalVenta           = pasajeros.filter(p => p.reservaCreada).reduce((sum, p) => sum + p.precio, 0)
  const todasReservasCreadas = pasajeros.length === totalPasajeros && pasajeros.length > 0 && pasajeros.every(p => p.reservaCreada)

  const buscarClienteFn = async (doc: string): Promise<Cliente | null> => {
    const { data } = await buscarClienteGQL({ variables: { nroDocumento: doc } })
    return data?.buscarCliente || null
  }
  const crearClienteFn = async (formData: any): Promise<Cliente | null> => {
    try {
      const { data } = await crearClienteGQL({ variables: { ...formData, correo: formData.correo || null, telefono: formData.telefono || null } })
      if (data?.crearCliente.ok) return data.crearCliente.cliente
      mostrar(false, data?.crearCliente.mensaje || 'Error'); return null
    } catch (e: any) { mostrar(false, e.message); return null }
  }

  const handleSeleccionarVuelo = async (p: Programacion) => {
    setProgSel(p); limpiar()
    try {
      const { data } = await crearVenta({ variables: { canal: 'caja' } })
      if (data?.crearVenta.ok) {
        setVentaId(data.crearVenta.venta.idVenta)
        const lista: PasajeroReserva[] = [
          ...Array(adultos).fill(null).map((_, i) => ({ index: i, tipo: 'adulto' as const, clase: '', asiento: null, cliente: null, reservaCreada: null, precio: 0 })),
          ...Array(ninos).fill(null).map((_, i) => ({ index: adultos + i, tipo: 'nino' as const, clase: '', asiento: null, cliente: null, reservaCreada: null, precio: 0 })),
        ]
        setPasajeros(lista); setPasajeroActivo(0)
      } else mostrar(false, 'Error al crear venta')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleGuardarPasajero = async (datos: Omit<PasajeroReserva, 'reservaCreada'>) => {
    if (!ventaId) return; limpiar()
    try {
      const { data } = await crearReserva({
        variables: { idCliente: parseInt(datos.cliente!.idCliente), idAsientoVuelo: parseInt(datos.asiento!.idAsientoVuelo), canal: 'caja', idVenta: parseInt(ventaId) }
      })
      if (data?.crearReserva.ok) {
        const reserva = data.crearReserva.reserva
        setPasajeros(prev => prev.map(p => p.index === datos.index ? { ...datos, reservaCreada: { idReserva: reserva.idReserva, codigoReserva: reserva.codigoReserva } } : p))
        const siguiente = pasajeros.find(p => p.index > datos.index && !p.reservaCreada)
        setPasajeroActivo(siguiente ? siguiente.index : -1)
        mostrar(true, `Reserva ${reserva.codigoReserva} creada`)
      } else mostrar(false, data?.crearReserva.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleConfirmarEfectivo = async (montoRecibido: number, billetes: Record<number, number>) => {
    setMostrarModalBilletes(false); limpiar()
    const vars = { b200: billetes[200]||0, b100: billetes[100]||0, b50: billetes[50]||0, b20: billetes[20]||0, b10: billetes[10]||0, b5: billetes[5]||0, b2: billetes[2]||0, b1: billetes[1]||0 }
    try {
      if (totalPasajeros > 1 && ventaId) {
        const { data } = await confirmarVentaEfectivo({ variables: { idVenta: parseInt(ventaId), montoRecibido, ...vars } })
        if (data?.confirmarPagoVentaEfectivo.ok) { mostrar(true, data.confirmarPagoVentaEfectivo.mensaje); refetch(); resetNueva(); if (onNavegar) onNavegar('tickets') }
        else mostrar(false, data?.confirmarPagoVentaEfectivo.mensaje || 'Error')
      } else {
        const res = pasajeros[0]?.reservaCreada; if (!res) return
        const { data } = await confirmarEfectivo({ variables: { idReserva: parseInt(res.idReserva), montoRecibido, ...vars } })
        if (data?.confirmarPagoEfectivo.ok) { mostrar(true, data.confirmarPagoEfectivo.mensaje); refetch(); resetNueva(); if (onNavegar) onNavegar('tickets') }
        else mostrar(false, data?.confirmarPagoEfectivo.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleGenerarQR = async () => {
    limpiar()
    try {
      if (totalPasajeros > 1 && ventaId) {
        const { data } = await confirmarVentaQR({ variables: { idVenta: parseInt(ventaId) } })
        if (data?.confirmarPagoVentaQr.ok) { setPagoData({ urlPago: data.confirmarPagoVentaQr.urlPago, qrUrl: data.confirmarPagoVentaQr.qrUrl }); mostrar(true, data.confirmarPagoVentaQr.mensaje) }
        else mostrar(false, data?.confirmarPagoVentaQr.mensaje || 'Error')
      } else {
        const res = pasajeros[0]?.reservaCreada; if (!res) return
        const { data } = await generarPagoQR({ variables: { idReserva: parseInt(res.idReserva) } })
        if (data?.generarPagoQr.ok) { setPagoData({ urlPago: data.generarPagoQr.urlPago, qrUrl: data.generarPagoQr.qrUrl }); mostrar(true, data.generarPagoQr.mensaje) }
        else mostrar(false, data?.generarPagoQr.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleCancelar = async (idReserva: string) => {
    if (!confirm('¿Cancelar esta reserva? El ticket quedará anulado.')) return; limpiar()
    try {
      const { data } = await cancelarReserva({ variables: { idReserva: parseInt(idReserva) } })
      if (data?.cancelarReserva.ok) { mostrar(true, data.cancelarReserva.mensaje); refetch() }
      else mostrar(false, data?.cancelarReserva.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleModificarGuardar = async (idAsientoVuelo: string) => {
    if (!reservaModificar) return; limpiar()
    try {
      const { reserva, modo } = reservaModificar
      if (modo === 'editar') {
        const { data } = await editarReserva({ variables: { idReserva: parseInt(reserva.idReserva), idAsientoVuelo: parseInt(idAsientoVuelo) } })
        if (data?.editarReserva.ok) { mostrar(true, data.editarReserva.mensaje); setReservaModificar(null); refetch() }
        else mostrar(false, data?.editarReserva.mensaje || 'Error')
      } else {
        const { data } = await cambiarReserva({ variables: { idReserva: parseInt(reserva.idReserva), idAsientoVuelo: parseInt(idAsientoVuelo) } })
        if (data?.cambiarReservaConfirmada.ok) {
          const msg = data.cambiarReservaConfirmada.requierePago
            ? `${data.cambiarReservaConfirmada.mensaje} — Diferencia: Bs. ${data.cambiarReservaConfirmada.diferencia}`
            : data.cambiarReservaConfirmada.mensaje
          mostrar(true, msg); setReservaModificar(null); refetch()
        } else mostrar(false, data?.cambiarReservaConfirmada.mensaje || 'Error')
      }
    } catch (e: any) { mostrar(false, e.message) }
  }

  const resetNueva = () => {
    setModo('lista'); setProgSel(null)
    setFiltroOrigen(''); setFiltroDestino(''); setFiltroFecha('')
    setPasajeros([]); setPasajeroActivo(-1); setAdultos(1); setNinos(0)
    setVentaId(null); setPagoData(null); setClasePasajeroActivo('')
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Modales */}
      {mostrarModalBilletes && (
        <ModalBilletes
          precio={totalPasajeros > 1 ? totalVenta : (pasajeros[0]?.precio || 0)}
          onConfirmar={handleConfirmarEfectivo}
          onCerrar={() => setMostrarModalBilletes(false)}
        />
      )}
      {reservaModificar && (
        <ModalModificarReserva
          reserva={reservaModificar.reserva} modo={reservaModificar.modo}
          onGuardar={handleModificarGuardar}
          onCerrar={() => setReservaModificar(null)}
        />
      )}
      {reservaReembolso && (
        <ModalReembolso
          reserva={reservaReembolso}
          onCerrar={() => setReservaReembolso(null)}
          onIrDevoluciones={(datos) => {
            setReservaReembolso(null)
            if (onNavegar) onNavegar('devoluciones')
            sessionStorage.setItem('reembolso_pendiente', JSON.stringify(datos))
          }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reservas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestión de reservas de pasajes — Caja</p>
        </div>
        {modo === 'lista'
          ? <button onClick={() => { setModo('nueva'); limpiar() }} className={btnPrimary}>+ Nueva Reserva</button>
          : <button onClick={resetNueva} className={btnSecondary}>← Volver a lista</button>
        }
      </div>

      {mensaje && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm border border-green-200 font-medium">{mensaje}</div>}
      {error   && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm border border-red-200 font-medium">{error}</div>}

      {/* ── NUEVA RESERVA ─────────────────────────────────────────────────── */}
      {modo === 'nueva' && (
        <div className="flex gap-6">
          <div className="flex-1 space-y-4">
            {/* Paso 1 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <PasoHeader numero={1} titulo="Buscar vuelo y seleccionar pasajeros" completado={!!progSel} />
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div>
                  <label className={labelCls}>Origen</label>
                  <select value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)} className={inputCls}>
                    <option value="">Todos</option>
                    {(dataAeropuertos?.aeropuertos || []).map(a => <option key={a.idAeropuerto} value={a.idAeropuerto}>{a.codigo} — {a.ciudad}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Destino</label>
                  <select value={filtroDestino} onChange={e => setFiltroDestino(e.target.value)} className={inputCls}>
                    <option value="">Todos</option>
                    {(dataAeropuertos?.aeropuertos || []).map(a => <option key={a.idAeropuerto} value={a.idAeropuerto}>{a.codigo} — {a.ciudad}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Fecha salida</label>
                  <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className={inputCls} />
                </div>
                <SelectorPasajeros adultos={adultos} ninos={ninos} onCambiar={(a, n) => { setAdultos(a); setNinos(n) }} />
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 text-left border-b border-slate-200">Código</th>
                      <th className="px-4 py-2.5 text-left border-b border-slate-200">Origen</th>
                      <th className="px-4 py-2.5 text-left border-b border-slate-200">Destino</th>
                      <th className="px-4 py-2.5 text-left border-b border-slate-200">Salida</th>
                      <th className="px-4 py-2.5 text-left border-b border-slate-200">Llegada</th>
                      <th className="px-4 py-2.5 text-left border-b border-slate-200">Aeronave</th>
                      <th className="px-4 py-2.5 text-center border-b border-slate-200">Disponibles</th>
                      <th className="px-4 py-2.5 text-right border-b border-slate-200">Precio base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vuelosFiltrados.map((p, i) => {
                      const disponibles = p.asientosDisponible - p.asientoVendido
                      const suficientes = disponibles >= totalPasajeros
                      return (
                        <tr key={p.idProgramacion}
                          onClick={() => suficientes && !progSel && handleSeleccionarVuelo(p)}
                          className={`cursor-pointer transition border-b border-slate-100 ${
                            !suficientes ? 'opacity-40 cursor-not-allowed'
                            : progSel?.idProgramacion === p.idProgramacion ? 'bg-blue-50 border-l-4 border-l-blue-700'
                            : i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'
                          }`}>
                          <td className="px-4 py-3">
                            <span className="font-bold text-blue-800">{p.codigoVuelo}</span>
                            {progSel?.idProgramacion === p.idProgramacion && escalas.length > 0 && (
                              <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded">{escalas.length} escala{escalas.length > 1 ? 's' : ''}</span>
                            )}
                            {p.estado === 'reprogramado' && <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded">reprogramado</span>}
                          </td>
                          <td className="px-4 py-3"><span className="font-semibold">{p.idRuta.idAeropuertoOrigen.codigo}</span><span className="block text-xs text-slate-400">{p.idRuta.idAeropuertoOrigen.ciudad}</span></td>
                          <td className="px-4 py-3"><span className="font-semibold">{p.idRuta.idAeropuertoDestino.codigo}</span><span className="block text-xs text-slate-400">{p.idRuta.idAeropuertoDestino.ciudad}</span></td>
                          <td className="px-4 py-3"><span>{p.fechaSalida}</span><span className="block text-xs text-blue-600 font-medium">{p.horaSalida}</span></td>
                          <td className="px-4 py-3"><span>{p.fechaLlegada}</span><span className="block text-xs text-blue-600 font-medium">{p.horaLlegada}</span></td>
                          <td className="px-4 py-3"><span className="text-xs font-medium">{p.idAeronave.codigoAeronave}</span><span className="block text-xs text-slate-400">{p.idAeronave.modelo}</span></td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${disponibles > 0 ? 'text-green-600' : 'text-red-500'}`}>{disponibles}</span>
                            <span className="text-slate-400 text-xs"> / {p.asientosDisponible}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">Bs. {p.precioBase}</td>
                        </tr>
                      )
                    })}
                    {vuelosFiltrados.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">No hay vuelos disponibles</td></tr>}
                  </tbody>
                </table>
              </div>
              {progSel && escalas.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  <span className="font-semibold">Escalas:</span> {progSel.idRuta.idAeropuertoOrigen.codigo}{escalas.map(e => ` → ${e.aeropuerto.codigo} (${e.tiempoDuracion} min)`).join('')} → {progSel.idRuta.idAeropuertoDestino.codigo}
                </div>
              )}
              {progSel && escalas.length === 0 && (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500">✈ Vuelo directo — sin escalas</div>
              )}
            </div>

            {/* Pasajeros */}
            {progSel && pasajeros.length > 0 && (
              <div className="space-y-4">
                {pasajeros.filter(p => p.reservaCreada).map(p => (
                  <div key={p.index} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">✓</span>
                      <div>
                        <p className="font-bold text-green-800 text-sm">Pasajero {p.index + 1} — {p.cliente?.nombreCompleto}</p>
                        <p className="text-green-600 text-xs">{CLASE_LABEL[p.clase]} · {p.asiento?.idAsiento.numero} · Bs. {p.precio} · {p.reservaCreada?.codigoReserva}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {pasajeroActivo >= 0 && pasajeros[pasajeroActivo] && !pasajeros[pasajeroActivo].reservaCreada && (
                  <FormPasajero key={pasajeroActivo} index={pasajeroActivo} tipo={pasajeros[pasajeroActivo].tipo}
                    progSel={progSel} dataClases={dataClases?.clasesVuelo || []}
                    dataAsientos={dataAsientos?.asientosVueloClase || []}
                    asientosYaElegidos={asientosYaElegidos}
                    onGuardar={datos => { setClasePasajeroActivo(datos.clase); handleGuardarPasajero(datos) }}
                    onCancelar={() => setPasajeroActivo(-1)}
                    buscarClienteFn={buscarClienteFn} crearClienteFn={crearClienteFn}
                    onClaseChange={clase => setClasePasajeroActivo(clase)} />
                )}
                {pasajeros.filter(p => !p.reservaCreada && p.index !== pasajeroActivo).map(p => (
                  <div key={p.index} onClick={() => setPasajeroActivo(p.index)}
                    className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                    <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center">{p.index + 1}</span>
                    <span className="text-sm text-slate-500">Pasajero {p.index + 1} — <span className="capitalize">{p.tipo}</span> — click para configurar</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pago */}
            {todasReservasCreadas && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <PasoHeader numero={3} titulo="Procesar pago" />
                <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase">{totalPasajeros > 1 ? `${totalPasajeros} reservas agrupadas` : pasajeros[0]?.reservaCreada?.codigoReserva}</p>
                    <div className="text-right"><p className="text-xs font-semibold text-slate-500 uppercase">Total</p><p className="font-bold text-slate-800 text-lg">Bs. {totalVenta.toFixed(2)}</p></div>
                  </div>
                  {totalPasajeros > 1 && (
                    <div className="space-y-1 border-t border-slate-200 pt-2">
                      {pasajeros.map(p => (
                        <div key={p.index} className="flex justify-between text-xs text-slate-500">
                          <span>{p.cliente?.nombreCompleto} — {CLASE_LABEL[p.clase]} — {p.asiento?.idAsiento.numero}</span>
                          <span className="font-medium">Bs. {p.precio}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-slate-400 text-xs mt-2 border-t border-slate-200 pt-2">⏱ 30 minutos para completar el pago</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleGenerarQR} className={`${btnPrimary} py-3 text-center`}>📱 Pagar con QR Libélula</button>
                  <button onClick={() => setMostrarModalBilletes(true)} className={`${btnSuccess} py-3 text-center`}>💵 Confirmar pago en efectivo</button>
                </div>
                {pagoData?.urlPago && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-blue-800 mb-3">QR generado — muéstralo al cliente</p>
                    {pagoData.qrUrl && <img src={pagoData.qrUrl} alt="QR Pago" className="w-52 h-52 mb-3 rounded-lg border border-blue-200" />}
                    <a href={pagoData.urlPago} target="_blank" rel="noreferrer" className="inline-block text-blue-700 text-sm font-semibold underline hover:text-blue-900">Abrir pasarela →</a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel resumen */}
          <div className="w-72">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky top-6">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 pb-3 border-b border-slate-200">Resumen</h3>
              {progSel ? (
                <div className="mb-3 pb-3 border-b border-slate-100">
                  <div className="font-bold text-blue-800">{progSel.codigoVuelo}</div>
                  <div className="text-xs text-slate-500">{progSel.idRuta.idAeropuertoOrigen.codigo} → {progSel.idRuta.idAeropuertoDestino.codigo}</div>
                  <div className="text-xs text-slate-400">{progSel.fechaSalida} {progSel.horaSalida}</div>
                </div>
              ) : <p className="text-center text-xs text-slate-400 mb-3">Selecciona un vuelo</p>}
              <div className="space-y-1 mb-3 text-xs">
                <div className="flex justify-between text-slate-500"><span>Adultos</span><span className="font-semibold">{adultos}</span></div>
                <div className="flex justify-between text-slate-500"><span>Niños</span><span className="font-semibold">{ninos}</span></div>
                <div className="flex justify-between font-bold text-slate-700 pt-1 border-t border-slate-100"><span>Total pasajeros</span><span>{totalPasajeros}</span></div>
              </div>
              {pasajeros.filter(p => p.reservaCreada).length > 0 && (
                <div className="space-y-1 border-t border-slate-100 pt-3">
                  {pasajeros.filter(p => p.reservaCreada).map(p => (
                    <div key={p.index} className="text-xs bg-green-50 rounded px-2 py-1.5">
                      <div className="font-semibold text-green-800">{p.cliente?.nombreCompleto}</div>
                      <div className="text-green-600">{CLASE_LABEL[p.clase]} · {p.asiento?.idAsiento.numero} · Bs. {p.precio}</div>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-sm text-blue-800 pt-2 border-t border-slate-100"><span>Total</span><span>Bs. {totalVenta.toFixed(2)}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LISTA agrupada por vuelo ───────────────────────────────────────── */}
      {modo === 'lista' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
            <div>
              <label className={labelCls}>Estado</label>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="cancelada">Cancelada</option>
                <option value="expirada">Expirada</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Canal</label>
              <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Todos</option>
                <option value="caja">Caja</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="flex gap-2 ml-4">
              <button onClick={() => setGruposExpandidos(new Set(grupos.map(g => g.idProgramacion)))}
                className={btnSecondary + ' text-xs py-1.5 px-3'}>
                Expandir todo
              </button>
              <button onClick={() => setGruposExpandidos(new Set())}
                className={btnSecondary + ' text-xs py-1.5 px-3'}>
                Colapsar todo
              </button>
            </div>
            <div className="ml-auto text-xs text-slate-400">
              {grupos.length} vuelo{grupos.length !== 1 ? 's' : ''} · {grupos.reduce((s, g) => s + g.reservas.length, 0)} reservas
            </div>
          </div>

          {/* Tabla agrupada */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Código / Vuelo</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Pasajero</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Asiento</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Canal</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Fecha reserva</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Fecha pago</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Estado</th>
                  <th className="px-4 py-3 text-left border-b border-slate-200">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {grupos.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">No hay reservas</td></tr>
                )}
                {grupos.map(grupo => (
                  <FilaGrupo
                    key={grupo.idProgramacion}
                    grupo={grupo}
                    expandido={gruposExpandidos.has(grupo.idProgramacion)}
                    onToggle={() => toggleGrupo(grupo.idProgramacion)}
                    onEditar={r => setReservaModificar({ reserva: r, modo: 'editar' })}
                    onCancelar={handleCancelar}
                    onCambiar={r => setReservaModificar({ reserva: r, modo: 'cambiar' })}
                    onReembolso={r => setReservaReembolso(r)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReservasPage