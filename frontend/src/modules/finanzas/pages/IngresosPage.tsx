import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { GET_INGRESOS, GET_RESUMEN_FINANCIERO, GET_INGRESOS_POR_FECHA } from '../graphql/queries'

interface Ingreso {
  idIngreso: string; concepto: string; tipo: string; monto: number; fecha: string
  observaciones: string
  idTicket: {
    idTicket: string; codigoTicket: string
    idReserva: {
      idCliente: { nombreCompleto: string }
      idAsientoVuelo: {
        idAsiento: { numero: string; clase: string }
        idProgramacion: {
          codigoVuelo: string
          idRuta: { idAeropuertoOrigen: { codigo: string }; idAeropuertoDestino: { codigo: string } }
        }
      }
    }
  } | null
}

interface ResumenFinanciero {
  totalIngresos: number; totalEgresos: number; balance: number
  totalVentas: number; totalDevoluciones: number
}

interface GetIngresosRes  { ingresos: Ingreso[]; ingresosPorFecha: Ingreso[] }
interface GetResumenRes   { resumenFinanciero: ResumenFinanciero }

const CLASE_LABEL: Record<string, string> = {
  economica: 'Económica', economica_premium: 'Econ. Premium',
  ejecutiva: 'Ejecutiva', primera_clase: 'Primera Clase',
}

const btnPrimary   = "bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-blue-900 transition"
const btnSecondary = "bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 transition"
const inputCls     = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
const labelCls     = "block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide"

const IngresosPage = () => {
  const [filtroFecha, setFiltroFecha] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin]       = useState('')

  const { data: dataIngresos } = useQuery<GetIngresosRes>(GET_INGRESOS, { fetchPolicy: 'network-only' })
  const { data: dataResumen }  = useQuery<GetResumenRes>(GET_RESUMEN_FINANCIERO, { fetchPolicy: 'network-only' })
  const { data: dataFecha }    = useQuery<GetIngresosRes>(GET_INGRESOS_POR_FECHA, {
    variables: { fechaInicio, fechaFin },
    skip: !filtroFecha || !fechaInicio || !fechaFin,
    fetchPolicy: 'network-only'
  })

  const ingresos = filtroFecha && fechaInicio && fechaFin
    ? (dataFecha?.ingresosPorFecha || [])
    : (dataIngresos?.ingresos || [])

  const resumen = dataResumen?.resumenFinanciero

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Ingresos</h1>
        <p className="text-slate-500 text-sm mt-0.5">Registro de ingresos por venta de pasajes</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Ingresos',    val: `Bs. ${resumen?.totalIngresos?.toFixed(2) || '0.00'}`, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          { label: 'Total Egresos',     val: `Bs. ${resumen?.totalEgresos?.toFixed(2)  || '0.00'}`, color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
          { label: 'Balance',           val: `Bs. ${resumen?.balance?.toFixed(2)        || '0.00'}`, color: 'text-blue-800',  bg: 'bg-blue-50 border-blue-200' },
          { label: 'Pasajes vendidos',  val: resumen?.totalVentas || 0,                              color: 'text-slate-700', bg: 'bg-white border-slate-200' },
        ].map(item => (
          <div key={item.label} className={`rounded-xl border p-4 ${item.bg}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.val}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex items-end gap-4">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={filtroFecha} onChange={e => setFiltroFecha(e.target.checked)}
            className="w-4 h-4 accent-blue-700" />
          <label className="text-sm font-medium text-slate-600">Filtrar por fecha</label>
        </div>
        {filtroFecha && (
          <>
            <div>
              <label className={labelCls}>Desde</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className={labelCls}>Hasta</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
          </>
        )}
        <div className="ml-auto text-xs text-slate-400">{ingresos.length} registro(s)</div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left border-b border-slate-200">Concepto</th>
              <th className="px-4 py-3 text-left border-b border-slate-200">Pasajero</th>
              <th className="px-4 py-3 text-left border-b border-slate-200">Vuelo</th>
              <th className="px-4 py-3 text-left border-b border-slate-200">Clase / Asiento</th>
              <th className="px-4 py-3 text-left border-b border-slate-200">Tipo</th>
              <th className="px-4 py-3 text-right border-b border-slate-200">Monto</th>
              <th className="px-4 py-3 text-left border-b border-slate-200">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {ingresos.map((ing, i) => (
              <tr key={ing.idIngreso}
                className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-4 py-3 text-xs">{ing.concepto}</td>
                <td className="px-4 py-3">
                  {ing.idTicket
                    ? <p className="text-xs font-medium">{ing.idTicket.idReserva.idCliente.nombreCompleto}</p>
                    : <span className="text-slate-400 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {ing.idTicket
                    ? <><p className="font-semibold text-xs">{ing.idTicket.idReserva.idAsientoVuelo.idProgramacion.codigoVuelo}</p>
                       <p className="text-xs text-slate-400">{ing.idTicket.idReserva.idAsientoVuelo.idProgramacion.idRuta.idAeropuertoOrigen.codigo} → {ing.idTicket.idReserva.idAsientoVuelo.idProgramacion.idRuta.idAeropuertoDestino.codigo}</p></>
                    : <span className="text-slate-400 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {ing.idTicket
                    ? <span className="text-xs">{CLASE_LABEL[ing.idTicket.idReserva.idAsientoVuelo.idAsiento.clase] || ing.idTicket.idReserva.idAsientoVuelo.idAsiento.clase} — {ing.idTicket.idReserva.idAsientoVuelo.idAsiento.numero}</span>
                    : <span className="text-slate-400 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <span className="bg-green-100 text-green-700 border border-green-300 px-2 py-0.5 rounded text-xs font-semibold">
                    {ing.tipo === 'venta_pasaje' ? 'Venta' : 'Otro'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-700">Bs. {Number(ing.monto).toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(ing.fecha).toLocaleDateString('es-BO')}
                </td>
              </tr>
            ))}
            {ingresos.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No hay ingresos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default IngresosPage