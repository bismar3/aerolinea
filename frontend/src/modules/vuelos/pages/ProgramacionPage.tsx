import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { GET_PROGRAMACIONES, GET_RUTAS, GET_AERONAVES, GET_ESCALAS } from '../graphql/queries'
import {
  CREAR_PROGRAMACION_MUTATION,
  ACTUALIZAR_PROGRAMACION_MUTATION,
  ELIMINAR_PROGRAMACION_MUTATION,
} from '../graphql/mutations'

interface Aeropuerto { nombre: string; codigo: string; ciudad: string }
interface Escala     { idEscala: string; ciudad: string; orden: number; tiempoDuracion: number; aeropuerto: { codigo: string } }
interface Ruta       { idRuta: string; tipo: string; distanciaKm: number; duracionHr: number; idAeropuertoOrigen: Aeropuerto; idAeropuertoDestino: Aeropuerto }
interface Aeronave   { idAeronave: string; codigoAeronave: string; modelo: string; asientosEconomica: number; asientosEconomicaPremium: number; asientosEjecutiva: number; asientosPrimeraClase: number; totalAsientos: number }
interface Programacion {
  idProgramacion: string; codigoVuelo: string
  fechaSalida: string; horaSalida: string; fechaLlegada: string; horaLlegada: string
  asientosDisponible: number; asientoVendido: number; precioBase: number
  ocupacionMinima: number; estado: string
  motivoCancelacion: string | null; descripcionCancelacion: string | null
  idRuta: Ruta; idAeronave: Aeronave
}

interface CrearProgRes      { crearProgramacionVuelo:      { ok: boolean; mensaje: string; codigoVuelo: string } }
interface ActualizarProgRes { actualizarProgramacionVuelo: { ok: boolean; mensaje: string } }
interface EliminarProgRes   { eliminarProgramacionVuelo:   { ok: boolean; mensaje: string } }

const ESTADOS = ['programado', 'en_vuelo', 'aterrizado', 'cancelado', 'retrasado']
const MOTIVOS = [
  { value: 'meteorologia',   label: 'Condiciones Meteorológicas' },
  { value: 'falta_cupos',    label: 'Falta de Ocupación Mínima' },
  { value: 'administrativo', label: 'Decisión Administrativa' },
  { value: 'falla_tecnica',  label: 'Falla Técnica' },
  { value: 'otro',           label: 'Otro Motivo' },
]
const INCREMENTOS: Record<string, number> = { economica: 0, economica_premium: 10, ejecutiva: 15, primera_clase: 20 }
const CLASE_LABEL: Record<string, string> = { economica: 'Económica', economica_premium: 'Econ. Premium', ejecutiva: 'Ejecutiva', primera_clase: 'Primera Clase' }

const estadoColor = (e: string) => ({
  programado: 'bg-blue-100 text-blue-700',
  en_vuelo:   'bg-green-100 text-green-700',
  aterrizado: 'bg-slate-100 text-slate-600',
  cancelado:  'bg-red-100 text-red-700',
  retrasado:  'bg-yellow-100 text-yellow-700',
  reprogramado: 'bg-purple-100 text-purple-700',
}[e] || 'bg-slate-100 text-slate-600')

function calcularLlegada(fechaSalida: string, horaSalida: string, duracionHr: number) {
  if (!fechaSalida || !horaSalida || !duracionHr) return null
  const [y, m, d] = fechaSalida.split('-').map(Number)
  const [hh, mm]  = horaSalida.split(':').map(Number)
  const llegada   = new Date(new Date(y, m - 1, d, hh, mm).getTime() + duracionHr * 3600000)
  const pad       = (n: number) => String(n).padStart(2, '0')
  return {
    fecha: `${llegada.getFullYear()}-${pad(llegada.getMonth() + 1)}-${pad(llegada.getDate())}`,
    hora:  `${pad(llegada.getHours())}:${pad(llegada.getMinutes())}`,
  }
}

const ProgramacionPage = () => {
  const [modo, setModo]       = useState<'lista' | 'nuevo' | 'editar'>('lista')
  const [sel, setSel]         = useState<Programacion | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [error, setError]     = useState('')
  const [rutaSel, setRutaSel] = useState<Ruta | null>(null)
  const [aerSel, setAerSel]   = useState<Aeronave | null>(null)

  const [form, setForm] = useState({
    idRuta: '', idAeronave: '', fechaSalida: '', horaSalida: '',
    fechaLlegada: '', horaLlegada: '', precioBase: ''
  })
  const [formEditar, setFormEditar] = useState({
    estado: '', precioBase: '', motivoCancelacion: '', descripcionCancelacion: ''
  })

  const { data: dataProg, refetch } = useQuery<{ programaciones: Programacion[] }>(GET_PROGRAMACIONES, { fetchPolicy: 'network-only' })
  const { data: dataRutas }         = useQuery<{ rutas: Ruta[] }>(GET_RUTAS, { fetchPolicy: 'network-only' })
  const { data: dataAeronaves }     = useQuery<{ aeronaves: Aeronave[] }>(GET_AERONAVES, { fetchPolicy: 'network-only' })
  const { data: dataEscalas }       = useQuery<{ escalas: Escala[] }>(GET_ESCALAS, {
    variables: { idRuta: rutaSel ? parseInt(rutaSel.idRuta) : null },
    skip: !rutaSel, fetchPolicy: 'network-only',
  })

  const [crearProg]      = useMutation<CrearProgRes>(CREAR_PROGRAMACION_MUTATION)
  const [actualizarProg] = useMutation<ActualizarProgRes>(ACTUALIZAR_PROGRAMACION_MUTATION)
  const [eliminarProg]   = useMutation<EliminarProgRes>(ELIMINAR_PROGRAMACION_MUTATION)

  const limpiar = () => { setMensaje(''); setError('') }
  const mostrar = (ok: boolean, msg: string) => {
    if (ok) { setMensaje('✅ ' + msg); setError('') }
    else    { setError('❌ ' + msg);   setMensaje('') }
  }

  useEffect(() => {
    if (rutaSel?.duracionHr && form.fechaSalida && form.horaSalida) {
      const llegada = calcularLlegada(form.fechaSalida, form.horaSalida, rutaSel.duracionHr)
      if (llegada) setForm(f => ({ ...f, fechaLlegada: llegada.fecha, horaLlegada: llegada.hora }))
    }
  }, [form.fechaSalida, form.horaSalida, rutaSel])

  const escalas = [...(dataEscalas?.escalas || [])].sort((a, b) => a.orden - b.orden)
  const requiereMotivo = ['cancelado', 'retrasado'].includes(formEditar.estado)

  const preciosClase = () => {
    const base = parseFloat(form.precioBase)
    if (!aerSel || !base) return []
    return [
      { clase: 'primera_clase',     asientos: aerSel.asientosPrimeraClase },
      { clase: 'ejecutiva',         asientos: aerSel.asientosEjecutiva },
      { clase: 'economica_premium', asientos: aerSel.asientosEconomicaPremium },
      { clase: 'economica',         asientos: aerSel.asientosEconomica },
    ].filter(c => c.asientos > 0).map(({ clase, asientos }) => ({
      clase, asientos,
      precio: (base * (1 + INCREMENTOS[clase] / 100)).toFixed(2),
      incremento: INCREMENTOS[clase]
    }))
  }

  const codigoPreview = () => {
    if (!rutaSel) return '—'
    const tipo = rutaSel.tipo === 'internacional' ? 'I' : 'N'
    const conEscala = escalas.length > 0 ? 'E' : ''
    return `BOA-${tipo}${conEscala}-###`
  }

  const handleRutaChange = (idRuta: string) => {
    const ruta = dataRutas?.rutas.find(r => r.idRuta === idRuta) || null
    setRutaSel(ruta)
    setForm(f => ({ ...f, idRuta, fechaLlegada: '', horaLlegada: '' }))
  }

  const handleCrear = async () => {
    limpiar()
    if (!form.idRuta || !form.idAeronave || !form.precioBase || !form.fechaSalida || !form.horaSalida || !form.fechaLlegada || !form.horaLlegada)
      return mostrar(false, 'Todos los campos son requeridos')
    if (!aerSel || aerSel.totalAsientos === 0)
      return mostrar(false, 'La aeronave no tiene asientos registrados')
    try {
      const { data: res } = await crearProg({
        variables: {
          idRuta: parseInt(form.idRuta), idAeronave: parseInt(form.idAeronave),
          fechaSalida: form.fechaSalida, horaSalida: form.horaSalida,
          fechaLlegada: form.fechaLlegada, horaLlegada: form.horaLlegada,
          precioBase: parseFloat(form.precioBase),
        }
      })
      if (res?.crearProgramacionVuelo.ok) {
        mostrar(true, `${res.crearProgramacionVuelo.mensaje} — Código: ${res.crearProgramacionVuelo.codigoVuelo}`)
        setForm({ idRuta: '', idAeronave: '', fechaSalida: '', horaSalida: '', fechaLlegada: '', horaLlegada: '', precioBase: '' })
        setRutaSel(null); setAerSel(null); setModo('lista'); refetch()
      } else mostrar(false, res?.crearProgramacionVuelo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEditar = (p: Programacion) => {
    setSel(p)
    setFormEditar({ estado: p.estado, precioBase: String(p.precioBase), motivoCancelacion: '', descripcionCancelacion: '' })
    setModo('editar'); limpiar()
  }

  const handleActualizar = async () => {
    if (!sel) return
    limpiar()
    if (requiereMotivo && !formEditar.motivoCancelacion)
      return mostrar(false, 'Debes seleccionar el motivo de cancelación o retraso')
    try {
      const { data: res } = await actualizarProg({
        variables: {
          idProgramacion: parseInt(sel.idProgramacion),
          estado: formEditar.estado,
          precioBase: parseFloat(formEditar.precioBase),
          motivoCancelacion: requiereMotivo ? formEditar.motivoCancelacion : null,
          descripcionCancelacion: requiereMotivo ? formEditar.descripcionCancelacion : null,
        }
      })
      if (res?.actualizarProgramacionVuelo.ok) {
        mostrar(true, res.actualizarProgramacionVuelo.mensaje)
        setModo('lista'); refetch()
      } else mostrar(false, res?.actualizarProgramacionVuelo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este vuelo?')) return
    limpiar()
    try {
      const { data: res } = await eliminarProg({ variables: { idProgramacion: parseInt(id) } })
      if (res?.eliminarProgramacionVuelo.ok) { mostrar(true, res.eliminarProgramacionVuelo.mensaje); refetch() }
      else mostrar(false, res?.eliminarProgramacionVuelo.mensaje || 'Error')
    } catch (e: any) { mostrar(false, e.message) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Programación de Vuelos</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de vuelos programados</p>
        </div>
        {modo === 'lista' && (
          <button onClick={() => { setModo('nuevo'); limpiar() }}
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            + Nuevo Vuelo
          </button>
        )}
        {(modo === 'nuevo' || modo === 'editar') && (
          <button onClick={() => { setModo('lista'); setSel(null); setRutaSel(null); setAerSel(null); limpiar() }}
            className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold transition">
            ← Volver a lista
          </button>
        )}
      </div>

      {mensaje && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{mensaje}</div>}
      {error   && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* ── NUEVO ─────────────────────────────────────────────────────────── */}
      {modo === 'nuevo' && (
        <div className="flex gap-6">
          <div className="flex-1 bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Nuevo Vuelo</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Ruta *</label>
                <select value={form.idRuta} onChange={e => handleRutaChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Seleccionar ruta --</option>
                  {(dataRutas?.rutas || []).map(r => (
                    <option key={r.idRuta} value={r.idRuta}>
                      {r.idAeropuertoOrigen.codigo} → {r.idAeropuertoDestino.codigo} — {r.idAeropuertoOrigen.ciudad} → {r.idAeropuertoDestino.ciudad} ({r.tipo})
                    </option>
                  ))}
                </select>
              </div>
              {rutaSel && (
                <div className="col-span-2">
                  {escalas.length > 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-xs font-semibold text-amber-700 mr-2">Escalas:</span>
                      <span className="text-xs text-amber-800">
                        {rutaSel.idAeropuertoOrigen.codigo}
                        {escalas.map(e => ` → ${e.aeropuerto.codigo} (${e.tiempoDuracion} min)`).join('')}
                        {` → ${rutaSel.idAeropuertoDestino.codigo}`}
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-500">✈ Vuelo directo — sin escalas</span>
                    </div>
                  )}
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Aeronave *</label>
                <select value={form.idAeronave} onChange={e => { const aer = dataAeronaves?.aeronaves.find(a => a.idAeronave === e.target.value) || null; setAerSel(aer); setForm(f => ({ ...f, idAeronave: e.target.value })) }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Seleccionar aeronave --</option>
                  {(dataAeronaves?.aeronaves || []).map(a => (
                    <option key={a.idAeronave} value={a.idAeronave}>{a.codigoAeronave} - {a.modelo} ({a.totalAsientos} asientos)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio base Bs. (Económica) *</label>
                <input type="text" inputMode="decimal" value={form.precioBase} placeholder="ej: 350.00"
                  onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setForm({ ...form, precioBase: e.target.value }) }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha salida *</label>
                <input type="date" value={form.fechaSalida} onChange={e => setForm({ ...form, fechaSalida: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora salida *</label>
                <input type="time" value={form.horaSalida} onChange={e => setForm({ ...form, horaSalida: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha llegada *{rutaSel?.duracionHr && <span className="text-xs text-blue-600 ml-1">(auto)</span>}
                </label>
                <input type="date" value={form.fechaLlegada} onChange={e => setForm({ ...form, fechaLlegada: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hora llegada *{rutaSel?.duracionHr && <span className="text-xs text-blue-600 ml-1">(auto)</span>}
                </label>
                <input type="time" value={form.horaLlegada} onChange={e => setForm({ ...form, horaLlegada: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCrear} className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">Guardar</button>
              <button onClick={() => { setModo('lista'); setRutaSel(null); setAerSel(null) }} className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition">Cancelar</button>
            </div>
          </div>

          {/* Panel resumen */}
          <div className="w-80 bg-white rounded-xl shadow p-6 h-fit">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Resumen del vuelo</h3>
            <table className="w-full text-sm mb-4">
              <tbody>
                {[
                  ['Código', <span className="text-blue-800 font-medium">{codigoPreview()}</span>],
                  ['Tipo', rutaSel?.tipo || '—'],
                  ['Ruta', rutaSel ? `${rutaSel.idAeropuertoOrigen.codigo} → ${rutaSel.idAeropuertoDestino.codigo}` : '—'],
                  ['Distancia', rutaSel?.distanciaKm ? `${rutaSel.distanciaKm} km` : '—'],
                  ['Duración', rutaSel?.duracionHr ? `${rutaSel.duracionHr} hrs` : '—'],
                  ['Aeronave', aerSel?.codigoAeronave || '—'],
                  ['Salida', form.fechaSalida && form.horaSalida ? `${form.fechaSalida} ${form.horaSalida}` : '—'],
                  ['Llegada', form.fechaLlegada && form.horaLlegada ? `${form.fechaLlegada} ${form.horaLlegada}` : '—'],
                ].map(([label, value], i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 text-slate-500 text-xs">{label}</td>
                    <td className="py-2 font-medium text-right text-xs">{value}</td>
                  </tr>
                ))}
                {escalas.length > 0 && (
                  <tr className="border-b">
                    <td className="py-2 text-slate-500 text-xs">Escalas</td>
                    <td className="py-2 text-right">{escalas.map(e => <span key={e.idEscala} className="inline-block bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded ml-1">{e.aeropuerto.codigo}</span>)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {aerSel && preciosClase().length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Precios por clase</p>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr><th className="px-2 py-1 text-left">Clase</th><th className="px-2 py-1 text-center">Asientos</th><th className="px-2 py-1 text-right">Bs.</th></tr>
                  </thead>
                  <tbody>
                    {preciosClase().map(({ clase, asientos, precio, incremento }) => (
                      <tr key={clase} className="border-t">
                        <td className="px-2 py-1.5">{CLASE_LABEL[clase]}</td>
                        <td className="px-2 py-1.5 text-center font-medium">{asientos}</td>
                        <td className="px-2 py-1.5 text-right">{form.precioBase ? <>{precio}{incremento > 0 && <span className="text-slate-400 ml-1">+{incremento}%</span>}</> : '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 border-t">
                      <td className="px-2 py-1.5 font-semibold">Total</td>
                      <td className="px-2 py-1.5 text-center font-bold text-blue-800">{aerSel.totalAsientos}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── EDITAR ────────────────────────────────────────────────────────── */}
      {modo === 'editar' && sel && (
        <div className="bg-white rounded-xl shadow p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Editando: <span className="text-blue-800">{sel.codigoVuelo}</span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select value={formEditar.estado} onChange={e => setFormEditar({ ...formEditar, estado: e.target.value, motivoCancelacion: '', descripcionCancelacion: '' })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {/* Motivo — solo aparece al cancelar o retrasar */}
            {requiereMotivo && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-700 uppercase">
                  {formEditar.estado === 'cancelado' ? '⚠ Motivo de cancelación' : '⚠ Motivo del retraso'}
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo *</label>
                  <select value={formEditar.motivoCancelacion} onChange={e => setFormEditar({ ...formEditar, motivoCancelacion: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Seleccionar motivo --</option>
                    {MOTIVOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción adicional</label>
                  <textarea rows={2} value={formEditar.descripcionCancelacion}
                    onChange={e => setFormEditar({ ...formEditar, descripcionCancelacion: e.target.value })}
                    placeholder="Detalles adicionales (opcional)..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <p className="text-xs text-amber-600">
                  Se creará automáticamente un registro en Reprogramación.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio base (Bs.)</label>
              <input type="text" inputMode="decimal" value={formEditar.precioBase}
                onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setFormEditar({ ...formEditar, precioBase: e.target.value }) }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleActualizar} className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">Guardar Cambios</button>
            <button onClick={() => setModo('lista')} className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-6 py-2 rounded-lg text-sm transition">Cancelar</button>
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
                <th className="px-4 py-3">Ruta</th>
                <th className="px-4 py-3">Aeronave</th>
                <th className="px-4 py-3">Salida</th>
                <th className="px-4 py-3">Llegada</th>
                <th className="px-4 py-3">Precio Base</th>
                <th className="px-4 py-3">Ocupación</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(dataProg?.programaciones || []).map(p => {
                const pct = p.asientosDisponible > 0
                  ? Math.round((p.asientoVendido / p.asientosDisponible) * 100)
                  : 0
                return (
                  <tr key={p.idProgramacion} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-blue-800">{p.codigoVuelo}</td>
                    <td className="px-4 py-3">{p.idRuta.idAeropuertoOrigen.codigo} → {p.idRuta.idAeropuertoDestino.codigo}</td>
                    <td className="px-4 py-3">{p.idAeronave.codigoAeronave}</td>
                    <td className="px-4 py-3 text-xs">{p.fechaSalida} {p.horaSalida}</td>
                    <td className="px-4 py-3 text-xs">{p.fechaLlegada} {p.horaLlegada}</td>
                    <td className="px-4 py-3">Bs. {p.precioBase}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${pct >= p.ocupacionMinima ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor(p.estado)}`}>{p.estado}</span>
                        {p.motivoCancelacion && (
                          <div className="text-xs text-slate-400 mt-0.5">{MOTIVOS.find(m => m.value === p.motivoCancelacion)?.label}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEditar(p)} className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded text-xs font-semibold transition">Editar</button>
                        <button onClick={() => handleEliminar(p.idProgramacion)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold transition">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(dataProg?.programaciones || []).length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-400 text-sm">No hay vuelos programados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ProgramacionPage