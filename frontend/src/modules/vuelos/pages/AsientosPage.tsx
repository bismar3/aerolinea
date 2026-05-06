import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { GET_ASIENTOS, GET_AERONAVES } from '../graphql/queries'

interface Aeronave {
  idAeronave: string
  codigoAeronave: string
  modelo: string
}

interface Asiento {
  idAsiento: string
  numero: string
  fila: number
  clase: string
  estado: string
  idAeronave: Aeronave
}

interface GetAsientosRes  { asientos: Asiento[] }
interface GetAeronavesRes { aeronaves: Aeronave[] }

const CLASES = [
  { value: 'economica',         label: 'Económica' },
  { value: 'economica_premium', label: 'Económica Premium' },
  { value: 'ejecutiva',         label: 'Ejecutiva' },
  { value: 'primera_clase',     label: 'Primera Clase' },
]

const claseColor: Record<string, string> = {
  economica:         'bg-slate-100 text-slate-600',
  economica_premium: 'bg-blue-100 text-blue-700',
  ejecutiva:         'bg-purple-100 text-purple-700',
  primera_clase:     'bg-yellow-100 text-yellow-700',
}

const AsientosPage = () => {
  const [aeronaveFilter, setAeronaveFilter] = useState('')
  const [claseFilter, setClaseFilter]       = useState('')

  const { data: dataAeronaves } = useQuery<GetAeronavesRes>(GET_AERONAVES, { fetchPolicy: 'network-only' })
  const { data, refetch }       = useQuery<GetAsientosRes>(GET_ASIENTOS, {
    variables: aeronaveFilter ? { idAeronave: parseInt(aeronaveFilter) } : {},
    fetchPolicy: 'network-only'
  })

  const claseLabel = (clase: string) =>
    CLASES.find(c => c.value === clase)?.label || clase

  const asientosFiltrados = (data?.asientos || []).filter(a =>
    claseFilter ? a.clase === claseFilter : true
  )

  // Resumen por clase
  const resumen = CLASES.map(c => ({
    ...c,
    total: (data?.asientos || []).filter(a => a.clase === c.value).length,
    disponibles: (data?.asientos || []).filter(a => a.clase === c.value && a.estado === 'activo').length,
  })).filter(c => c.total > 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Asientos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Asientos generados automáticamente por aeronave
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Aeronave</label>
          <select value={aeronaveFilter}
            onChange={e => { setAeronaveFilter(e.target.value); refetch() }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas las aeronaves</option>
            {(dataAeronaves?.aeronaves || []).map(a => (
              <option key={a.idAeronave} value={a.idAeronave}>{a.codigoAeronave} - {a.modelo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Clase</label>
          <select value={claseFilter} onChange={e => setClaseFilter(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas las clases</option>
            {CLASES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Resumen por clase */}
      {resumen.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Resumen por clase</h3>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Clase</th>
                <th className="px-3 py-2 text-center">Total asientos</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map(c => (
                <tr key={c.value} className="border-t">
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${claseColor[c.value]}`}>
                      {c.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-medium">{c.total}</td>
                </tr>
              ))}
              <tr className="border-t bg-slate-50">
                <td className="px-3 py-2 font-semibold text-slate-700">Total</td>
                <td className="px-3 py-2 text-center font-bold text-blue-800">
                  {resumen.reduce((s, c) => s + c.total, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla de asientos */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Aeronave</th>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Fila</th>
              <th className="px-4 py-3">Clase</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {asientosFiltrados.map(a => (
              <tr key={a.idAsiento} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{a.idAeronave.codigoAeronave}</td>
                <td className="px-4 py-3 font-medium">{a.numero}</td>
                <td className="px-4 py-3">{a.fila}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${claseColor[a.clase]}`}>
                    {claseLabel(a.clase)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    a.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>{a.estado}</span>
                </td>
              </tr>
            ))}
            {asientosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">
                  {aeronaveFilter ? 'No hay asientos para esta aeronave' : 'Selecciona una aeronave para ver sus asientos'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AsientosPage