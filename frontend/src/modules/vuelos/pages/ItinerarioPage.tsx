import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { GET_PROGRAMACIONES, GET_ESCALAS, GET_ASIGNACIONES_GRUPO } from '../graphql/queries'

interface Aeropuerto { nombre: string; codigo: string; ciudad: string }
interface Ruta {
  idRuta: string; tipo: string; distanciaKm: number; duracionHr: number
  idAeropuertoOrigen: Aeropuerto; idAeropuertoDestino: Aeropuerto
}
interface Aeronave {
  idAeronave: string; codigoAeronave: string; modelo: string; totalAsientos: number
  asientosEconomica: number; asientosEconomicaPremium: number
  asientosEjecutiva: number; asientosPrimeraClase: number
}
interface Programacion {
  idProgramacion: string; codigoVuelo: string
  fechaSalida: string; horaSalida: string; fechaLlegada: string; horaLlegada: string
  asientosDisponible: number; asientoVendido: number; precioBase: number
  ocupacionMinima: number; estado: string
  motivoCancelacion: string | null
  idRuta: Ruta; idAeronave: Aeronave
}
interface Escala {
  idEscala: string; ciudad: string; orden: number; tiempoDuracion: number
  aeropuerto: { codigo: string; nombre: string }
}
interface Asignacion {
  idAsignacion: string; estado: string
  idGrupo: { idGrupo: string; nombre: string; estado: string; tripulantes: { idTripulante: string; nombre: string; apellido: string; cargo: string }[] }
  idProgramacion: { idProgramacion: string }
}

const CLASE_CONFIG = [
  { key: 'primera_clase',     label: 'Primera Clase',     incremento: 20, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { key: 'ejecutiva',         label: 'Ejecutiva',          incremento: 15, color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { key: 'economica_premium', label: 'Económica Premium',  incremento: 10, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { key: 'economica',         label: 'Económica',          incremento: 0,  color: 'bg-slate-100 text-slate-700 border-slate-300' },
]
const ASIENTOS_KEY: Record<string, keyof Aeronave> = {
  primera_clase:     'asientosPrimeraClase',
  ejecutiva:         'asientosEjecutiva',
  economica_premium: 'asientosEconomicaPremium',
  economica:         'asientosEconomica',
}
const CARGO_LABEL: Record<string, string> = { piloto: 'Piloto', copiloto: 'Copiloto', auxiliar: 'Auxiliar' }
const estadoColor = (e: string) => ({
  programado:   'bg-blue-100 text-blue-700',
  en_vuelo:     'bg-green-100 text-green-700',
  aterrizado:   'bg-slate-100 text-slate-600',
  cancelado:    'bg-red-100 text-red-700',
  retrasado:    'bg-yellow-100 text-yellow-700',
  reprogramado: 'bg-purple-100 text-purple-700',
}[e] || 'bg-slate-100 text-slate-600')

const ItinerarioPage = () => {
  const [busqueda, setBusqueda]     = useState({ origen: '', destino: '' })
  const [seleccionado, setSeleccionado] = useState<Programacion | null>(null)

  const { data: dataProg } = useQuery<{ programaciones: Programacion[] }>(
    GET_PROGRAMACIONES, { fetchPolicy: 'network-only' }
  )
  const { data: dataEscalas } = useQuery<{ escalas: Escala[] }>(
    GET_ESCALAS,
    {
      variables: { idRuta: seleccionado ? parseInt(seleccionado.idRuta.idRuta) : null },
      skip: !seleccionado,
      fetchPolicy: 'network-only',
    }
  )
  const { data: dataAsig } = useQuery<{ asignacionesGrupo: Asignacion[] }>(
    GET_ASIGNACIONES_GRUPO, { fetchPolicy: 'network-only' }
  )

  // Filtrar vuelos según búsqueda
  const vuelos = (dataProg?.programaciones || []).filter(p => {
    const origenMatch  = busqueda.origen  === '' ||
      p.idRuta.idAeropuertoOrigen.codigo.toLowerCase().includes(busqueda.origen.toLowerCase()) ||
      p.idRuta.idAeropuertoOrigen.ciudad.toLowerCase().includes(busqueda.origen.toLowerCase())
    const destinoMatch = busqueda.destino === '' ||
      p.idRuta.idAeropuertoDestino.codigo.toLowerCase().includes(busqueda.destino.toLowerCase()) ||
      p.idRuta.idAeropuertoDestino.ciudad.toLowerCase().includes(busqueda.destino.toLowerCase())
    return origenMatch && destinoMatch
  })

  const escalas = [...(dataEscalas?.escalas || [])].sort((a, b) => a.orden - b.orden)

  const asignacionVuelo = seleccionado
    ? dataAsig?.asignacionesGrupo.find(
        a => a.idProgramacion.idProgramacion === seleccionado.idProgramacion && a.estado === 'activo'
      )
    : null

  const pctOcupacion = (p: Programacion) =>
    p.asientosDisponible > 0 ? Math.round((p.asientoVendido / p.asientosDisponible) * 100) : 0

  const asientosDisponiblesPorClase = (p: Programacion, clase: string) => {
    const total     = p.idAeronave[ASIENTOS_KEY[clase]] as number
    const vendidos  = p.asientoVendido
    const pctClase  = total / p.asientosDisponible
    const vendClase = Math.round(vendidos * pctClase)
    return Math.max(0, total - vendClase)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Itinerario</h1>
        <p className="text-slate-500 text-sm mt-1">Consulta de vuelos programados en tiempo real</p>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Origen</label>
            <input
              type="text"
              value={busqueda.origen}
              onChange={e => setBusqueda({ ...busqueda, origen: e.target.value })}
              placeholder="Ciudad o código (ej: LPB, La Paz)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-slate-400 text-xl pb-2">→</div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Destino</label>
            <input
              type="text"
              value={busqueda.destino}
              onChange={e => setBusqueda({ ...busqueda, destino: e.target.value })}
              placeholder="Ciudad o código (ej: VVI, Santa Cruz)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setBusqueda({ origen: '', destino: '' })}
            className="border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm transition"
          >
            Limpiar
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {vuelos.length} vuelo{vuelos.length !== 1 ? 's' : ''} encontrado{vuelos.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Lista de vuelos */}
        <div className="flex-1 space-y-3">
          {vuelos.length === 0 && (
            <div className="bg-white rounded-xl shadow p-12 text-center text-slate-400">
              <div className="text-4xl mb-3">✈️</div>
              <p className="text-sm">No se encontraron vuelos con esos criterios</p>
            </div>
          )}
          {vuelos.map(p => {
            const pct = pctOcupacion(p)
            const isSelected = seleccionado?.idProgramacion === p.idProgramacion
            return (
              <div
                key={p.idProgramacion}
                onClick={() => setSeleccionado(isSelected ? null : p)}
                className={`bg-white rounded-xl shadow p-4 cursor-pointer transition border-2 ${
                  isSelected ? 'border-blue-800' : 'border-transparent hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Código y ruta */}
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-bold text-blue-800 text-base">{p.codigoVuelo}</div>
                      <div className="text-xs text-slate-500 capitalize">{p.idRuta.tipo}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <div className="font-bold text-slate-800">{p.idRuta.idAeropuertoOrigen.codigo}</div>
                        <div className="text-xs text-slate-500">{p.idRuta.idAeropuertoOrigen.ciudad}</div>
                        <div className="text-xs text-blue-600 font-medium">{p.horaSalida.slice(0, 5)}</div>
                      </div>
                      <div className="flex flex-col items-center px-2">
                        <div className="text-xs text-slate-400">{p.idRuta.duracionHr ? `${p.idRuta.duracionHr}h` : ''}</div>
                        <div className="flex items-center gap-1">
                          <div className="w-8 h-px bg-slate-300"></div>
                          <span className="text-slate-400 text-xs">✈</span>
                          <div className="w-8 h-px bg-slate-300"></div>
                        </div>
                        <div className="text-xs text-slate-400">{p.idRuta.distanciaKm ? `${p.idRuta.distanciaKm}km` : ''}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-slate-800">{p.idRuta.idAeropuertoDestino.codigo}</div>
                        <div className="text-xs text-slate-500">{p.idRuta.idAeropuertoDestino.ciudad}</div>
                        <div className="text-xs text-blue-600 font-medium">{p.horaLlegada.slice(0, 5)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Info derecha */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Fecha</div>
                      <div className="text-sm font-medium">{p.fechaSalida}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Asientos libres</div>
                      <div className="text-lg font-bold text-slate-800">
                        {p.asientosDisponible - p.asientoVendido}
                        <span className="text-xs text-slate-400 font-normal">/{p.asientosDisponible}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Ocupación</div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${pct >= p.ocupacionMinima ? 'bg-green-500' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{pct}%</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColor(p.estado)}`}>
                      {p.estado}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Panel detalle */}
        {seleccionado && (
          <div className="w-96 shrink-0 space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-xl font-bold text-blue-800">{seleccionado.codigoVuelo}</div>
                  <div className="text-sm text-slate-500 capitalize">{seleccionado.idRuta.tipo} · {seleccionado.idAeronave.modelo}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${estadoColor(seleccionado.estado)}`}>
                    {seleccionado.estado}
                  </span>
                  <button onClick={() => setSeleccionado(null)} className="text-xs text-slate-400 hover:text-slate-600">cerrar ×</button>
                </div>
              </div>

              {/* Recorrido */}
              <div className="flex items-center gap-2 py-3 border-t border-b border-slate-100">
                <div className="text-center">
                  <div className="font-bold text-slate-800">{seleccionado.idRuta.idAeropuertoOrigen.codigo}</div>
                  <div className="text-xs text-slate-500">{seleccionado.idRuta.idAeropuertoOrigen.ciudad}</div>
                  <div className="text-xs font-medium text-blue-600">{seleccionado.horaSalida.slice(0, 5)}</div>
                  <div className="text-xs text-slate-400">{seleccionado.fechaSalida}</div>
                </div>

                {escalas.length > 0 ? (
                  escalas.map(e => (
                    <div key={e.idEscala} className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-px bg-slate-300"></div>
                        <div className="text-xs text-slate-400">{e.tiempoDuracion}min</div>
                      </div>
                      <div className="text-center">
                        <div className="bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold px-2 py-1 rounded">
                          {e.aeropuerto.codigo}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{e.ciudad}</div>
                        <div className="text-xs text-amber-600">Escala</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-1 text-slate-300">
                      <div className="flex-1 h-px bg-slate-200 w-12"></div>
                      <span className="text-sm">✈</span>
                      <div className="flex-1 h-px bg-slate-200 w-12"></div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center">
                  <div className="w-6 h-px bg-slate-300"></div>
                </div>

                <div className="text-center">
                  <div className="font-bold text-slate-800">{seleccionado.idRuta.idAeropuertoDestino.codigo}</div>
                  <div className="text-xs text-slate-500">{seleccionado.idRuta.idAeropuertoDestino.ciudad}</div>
                  <div className="text-xs font-medium text-blue-600">{seleccionado.horaLlegada.slice(0, 5)}</div>
                  <div className="text-xs text-slate-400">{seleccionado.fechaLlegada}</div>
                </div>
              </div>

              {/* Datos ruta */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-slate-400">Distancia</div>
                  <div className="font-semibold">{seleccionado.idRuta.distanciaKm ? `${seleccionado.idRuta.distanciaKm} km` : '—'}</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-slate-400">Duración</div>
                  <div className="font-semibold">{seleccionado.idRuta.duracionHr ? `${seleccionado.idRuta.duracionHr} hrs` : '—'}</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-slate-400">Aeronave</div>
                  <div className="font-semibold">{seleccionado.idAeronave.codigoAeronave}</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-slate-400">Precio base</div>
                  <div className="font-semibold">Bs. {seleccionado.precioBase}</div>
                </div>
              </div>
            </div>

            {/* Asientos por clase */}
            <div className="bg-white rounded-xl shadow p-5">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Disponibilidad por clase</h4>
              <div className="space-y-2">
                {CLASE_CONFIG.map(({ key, label, incremento, color }) => {
                  const total = seleccionado.idAeronave[ASIENTOS_KEY[key]] as number
                  if (total === 0) return null
                  const disponibles = asientosDisponiblesPorClase(seleccionado, key)
                  const precio      = (seleccionado.precioBase * (1 + incremento / 100)).toFixed(2)
                  const pctDisp     = Math.round((disponibles / total) * 100)
                  return (
                    <div key={key} className={`border rounded-lg p-3 ${color}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-xs font-bold">Bs. {precio}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white bg-opacity-50 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-current opacity-60"
                            style={{ width: `${pctDisp}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{disponibles}/{total}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tripulación */}
            <div className="bg-white rounded-xl shadow p-5">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Tripulación</h4>
              {asignacionVuelo ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{asignacionVuelo.idGrupo.nombre}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      asignacionVuelo.idGrupo.estado === 'en_vuelo' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>{asignacionVuelo.idGrupo.estado}</span>
                  </div>
                  <div className="space-y-1">
                    {asignacionVuelo.idGrupo.tripulantes.map(t => (
                      <div key={t.idTripulante} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                        <span className="font-medium text-slate-700">{t.apellido}, {t.nombre}</span>
                        <span className="text-slate-500">{CARGO_LABEL[t.cargo] || t.cargo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  ⚠ Sin tripulación asignada
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ItinerarioPage