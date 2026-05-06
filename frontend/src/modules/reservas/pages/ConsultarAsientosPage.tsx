import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { GET_PROGRAMACIONES } from '../../vuelos/graphql/queries'
import { GET_CLASES_VUELO } from '../graphql/queries'

interface Aeropuerto { codigo: string; ciudad: string }
interface Ruta { idAeropuertoOrigen: Aeropuerto; idAeropuertoDestino: Aeropuerto }
interface Programacion {
  idProgramacion: string; codigoVuelo: string
  fechaSalida: string; horaSalida: string; estado: string
  asientosDisponible: number; asientoVendido: number
  idRuta: Ruta
  idAeronave: { modelo: string; totalAsientos: number }
}
interface ClaseResumen {
  clase: string; total: number; disponibles: number; precioBase: number; precioConOferta: number
}
interface Props { onNavegar?: (pagina: any) => void }

const CLASE_LABEL: Record<string, string> = {
  primera_clase: 'Primera Clase', ejecutiva: 'Ejecutiva',
  economica_premium: 'Econ. Premium', economica: 'Económica',
}
const CLASE_COLOR: Record<string, string> = {
  primera_clase:     'bg-yellow-100 text-yellow-800 border border-yellow-300',
  ejecutiva:         'bg-purple-100 text-purple-800 border border-purple-300',
  economica_premium: 'bg-blue-100 text-blue-800 border border-blue-300',
  economica:         'bg-slate-100 text-slate-700 border border-slate-300',
}

const ConsultarAsientosPage = ({ onNavegar }: Props) => {
  const [progSel, setProgSel]   = useState<Programacion | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const { data: dataProgs } = useQuery<{ programaciones: Programacion[] }>(GET_PROGRAMACIONES, { fetchPolicy: 'network-only' })
  const { data: dataClases } = useQuery<{ clasesVuelo: ClaseResumen[] }>(GET_CLASES_VUELO, {
    variables: { idProgramacion: parseInt(progSel?.idProgramacion || '0') },
    skip: !progSel, fetchPolicy: 'network-only'
  })

  // Fix: incluir reprogramado además de programado
  const vuelos = (dataProgs?.programaciones || []).filter(p => {
    if (!['programado', 'reprogramado'].includes(p.estado)) return false
    if (!busqueda) return true
    return (
      p.codigoVuelo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.idRuta.idAeropuertoOrigen.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.idRuta.idAeropuertoOrigen.ciudad.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.idRuta.idAeropuertoDestino.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.idRuta.idAeropuertoDestino.ciudad.toLowerCase().includes(busqueda.toLowerCase())
    )
  })

  return (
    <div className="p-6">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Consultar Asientos</h1>
        <p className="text-slate-500 text-sm mt-1">Disponibilidad de asientos por clase y vuelo</p>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <input type="text" value={busqueda} placeholder="Buscar por vuelo, origen o destino..."
              onChange={e => setBusqueda(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Vuelo</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Aeronave</th>
                  <th className="px-4 py-3 text-center">Disponibles</th>
                </tr>
              </thead>
              <tbody>
                {vuelos.map(p => {
                  const disponibles = p.asientosDisponible - p.asientoVendido
                  const isSelected  = progSel?.idProgramacion === p.idProgramacion
                  return (
                    <tr key={p.idProgramacion} onClick={() => setProgSel(isSelected ? null : p)}
                      className={`border-t cursor-pointer transition ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-800' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-800">{p.codigoVuelo}</span>
                        {p.estado === 'reprogramado' && (
                          <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded">reprogramado</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{p.idRuta.idAeropuertoOrigen.codigo}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="font-semibold">{p.idRuta.idAeropuertoDestino.codigo}</span>
                        <div className="text-xs text-slate-400">{p.idRuta.idAeropuertoOrigen.ciudad} → {p.idRuta.idAeropuertoDestino.ciudad}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{p.fechaSalida}</div>
                        <div className="text-xs text-blue-600 font-medium">{p.horaSalida}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.idAeronave.modelo}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-lg ${disponibles > 0 ? 'text-green-600' : 'text-red-500'}`}>{disponibles}</span>
                        <span className="text-xs text-slate-400"> / {p.asientosDisponible}</span>
                      </td>
                    </tr>
                  )
                })}
                {vuelos.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No hay vuelos programados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-80 shrink-0">
          {progSel ? (
            <div className="bg-white rounded-xl shadow p-6">
              <div className="mb-4 pb-3 border-b border-slate-100">
                <div className="text-xl font-bold text-blue-800">{progSel.codigoVuelo}</div>
                <div className="text-sm text-slate-500">{progSel.idRuta.idAeropuertoOrigen.ciudad} → {progSel.idRuta.idAeropuertoDestino.ciudad}</div>
                <div className="text-xs text-slate-400 mt-1">{progSel.fechaSalida} · {progSel.horaSalida}</div>
              </div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Disponibilidad por clase</h4>
              <div className="space-y-3">
                {(dataClases?.clasesVuelo || []).map(c => {
                  const pct = c.total > 0 ? Math.round((c.disponibles / c.total) * 100) : 0
                  return (
                    <div key={c.clase} className={`border rounded-lg p-3 ${CLASE_COLOR[c.clase]}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold">{CLASE_LABEL[c.clase] || c.clase}</span>
                        <span className="text-sm font-bold">Bs. {c.precioConOferta}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-white bg-opacity-60 rounded-full h-2">
                          <div className="h-2 rounded-full bg-current opacity-70" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold">{c.disponibles}/{c.total}</span>
                      </div>
                      <div className="text-xs opacity-70">
                        {c.disponibles > 0 ? `${c.disponibles} asientos disponibles` : 'Sin disponibilidad'}
                        {c.precioConOferta !== c.precioBase && <span className="ml-2 line-through">Bs. {c.precioBase}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-12 text-center text-slate-400">
              <div className="text-4xl mb-3">🪑</div>
              <p className="text-sm">Selecciona un vuelo para ver la disponibilidad por clase</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConsultarAsientosPage