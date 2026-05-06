import { useQuery } from '@apollo/client/react'
import { GET_TICKETS } from '../graphql/queries'

interface Aeropuerto { codigo: string; ciudad: string }
interface Ruta       { idAeropuertoOrigen: Aeropuerto; idAeropuertoDestino: Aeropuerto }
interface Asiento    { numero: string; clase: string }
interface Ticket {
  idTicket: string; codigoTicket: string; precio: number
  metodoPago: string; idTransaccion: string
  montoRecibido: number | null; vuelto: number | null
  fechaEmision: string; fechaPago: string; estado: string
  idReserva: {
    idReserva: string; codigoReserva: string; canal: string
    idCliente: { idCliente: string; nombreCompleto: string; nroDocumento: string }
    idAsientoVuelo: {
      idAsiento: Asiento
      idProgramacion: {
        codigoVuelo: string; fechaSalida: string; horaSalida: string
        idRuta: Ruta
      }
    }
  }
}

interface Props { onNavegar?: (pagina: any) => void }

const CLASE_LABEL: Record<string, string> = {
  economica: 'Económica', economica_premium: 'Econ. Premium',
  ejecutiva: 'Ejecutiva', primera_clase: 'Primera Clase'
}
const CLASE_COLOR: Record<string, string> = {
  economica:         'bg-slate-100 text-slate-600',
  economica_premium: 'bg-blue-100 text-blue-700',
  ejecutiva:         'bg-purple-100 text-purple-700',
  primera_clase:     'bg-yellow-100 text-yellow-700',
}
const METODO_LABEL: Record<string, string> = {
  qr_caja: 'QR — Caja', qr_online: 'QR — Online', efectivo: 'Efectivo', tarjeta: 'Tarjeta'
}

const fmtDateTime = (dt: string | null) => {
  if (!dt) return '—'
  const d = new Date(dt)
  return `${d.toLocaleDateString('es-BO')} ${d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`
}

// Genera URL de QR usando API pública (no requiere librería)
const getQRUrl = (texto: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(texto)}`

const handleImprimir = (t: Ticket) => {
  const ventana = window.open('', '_blank', 'width=420,height=700')
  if (!ventana) return
  const prog     = t.idReserva.idAsientoVuelo.idProgramacion
  const ruta     = prog.idRuta
  const qrUrl    = getQRUrl(`BOA:${t.codigoTicket}:${t.idReserva.codigoReserva}`)
  const claseLabel = CLASE_LABEL[t.idReserva.idAsientoVuelo.idAsiento.clase] || t.idReserva.idAsientoVuelo.idAsiento.clase

  ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket ${t.codigoTicket}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; max-width: 380px; }
        .header { text-align: center; margin-bottom: 12px; }
        .logo    { font-size: 22px; font-weight: bold; letter-spacing: 4px; }
        .sub     { font-size: 10px; color: #666; margin-top: 2px; }
        .linea   { border-top: 1px dashed #333; margin: 10px 0; }
        .linea2  { border-top: 2px solid #333; margin: 10px 0; }
        .codigo  { text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 3px; margin: 10px 0; background: #f5f5f5; padding: 8px; border-radius: 4px; }
        .fila    { display: flex; justify-content: space-between; margin: 5px 0; }
        .label   { color: #666; font-size: 10px; text-transform: uppercase; }
        .valor   { font-weight: bold; text-align: right; }
        .ruta    { text-align: center; font-size: 18px; font-weight: bold; margin: 8px 0; letter-spacing: 2px; }
        .qr-sec  { display: flex; align-items: center; gap: 12px; margin: 12px 0; }
        .qr-txt  { font-size: 9px; color: #666; flex: 1; }
        .asiento { text-align: center; background: #1e3a8a; color: white; padding: 8px; border-radius: 6px; margin: 8px 0; }
        .asiento-num { font-size: 28px; font-weight: bold; }
        .asiento-cls { font-size: 11px; opacity: 0.85; }
        .pie     { text-align: center; font-size: 9px; color: #999; margin-top: 12px; }
        @media print {
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">✈ BOA</div>
        <div class="sub">Boliviana de Aviación — Tarjeta de Embarque</div>
      </div>

      <div class="linea2"></div>

      <div class="ruta">${ruta.idAeropuertoOrigen.codigo} → ${ruta.idAeropuertoDestino.codigo}</div>
      <div class="fila">
        <span class="label">Origen</span>
        <span class="valor">${ruta.idAeropuertoOrigen.ciudad}</span>
      </div>
      <div class="fila">
        <span class="label">Destino</span>
        <span class="valor">${ruta.idAeropuertoDestino.ciudad}</span>
      </div>

      <div class="linea"></div>

      <div class="fila">
        <span class="label">Vuelo</span>
        <span class="valor">${prog.codigoVuelo}</span>
      </div>
      <div class="fila">
        <span class="label">Fecha salida</span>
        <span class="valor">${prog.fechaSalida}</span>
      </div>
      <div class="fila">
        <span class="label">Hora salida</span>
        <span class="valor">${prog.horaSalida}</span>
      </div>

      <div class="linea"></div>

      <div class="fila">
        <span class="label">Pasajero</span>
        <span class="valor">${t.idReserva.idCliente.nombreCompleto}</span>
      </div>
      <div class="fila">
        <span class="label">Documento</span>
        <span class="valor">${t.idReserva.idCliente.nroDocumento}</span>
      </div>

      <div class="linea"></div>

      <div class="asiento">
        <div class="asiento-num">${t.idReserva.idAsientoVuelo.idAsiento.numero}</div>
        <div class="asiento-cls">${claseLabel}</div>
      </div>

      <div class="linea"></div>

      <div class="fila">
        <span class="label">Precio</span>
        <span class="valor">Bs. ${t.precio}</span>
      </div>
      <div class="fila">
        <span class="label">Método pago</span>
        <span class="valor">${METODO_LABEL[t.metodoPago] || t.metodoPago}</span>
      </div>
      ${t.montoRecibido != null ? `
      <div class="fila">
        <span class="label">Recibido</span>
        <span class="valor">Bs. ${t.montoRecibido}</span>
      </div>
      <div class="fila">
        <span class="label">Vuelto</span>
        <span class="valor">Bs. ${t.vuelto}</span>
      </div>` : ''}
      <div class="fila">
        <span class="label">Fecha pago</span>
        <span class="valor">${fmtDateTime(t.fechaPago)}</span>
      </div>

      <div class="linea"></div>

      <!-- Código del ticket + QR -->
      <div class="codigo">${t.codigoTicket}</div>

      <div class="qr-sec">
        <img src="${qrUrl}" width="110" height="110" alt="QR ${t.codigoTicket}" />
        <div class="qr-txt">
          <strong>Código de verificación</strong><br/>
          Escanea este QR para verificar la autenticidad del ticket.<br/><br/>
          Reserva: ${t.idReserva.codigoReserva}
        </div>
      </div>

      <div class="linea2"></div>

      <div class="pie">Ticket válido solo para el vuelo y asiento indicados.</div>
      <div class="pie">Preséntese con documento de identidad al momento del abordaje.</div>
      <div class="pie" style="margin-top:6px">Gracias por volar con BOA — Boliviana de Aviación</div>

      <script>
        // Esperar a que cargue el QR antes de imprimir
        window.onload = function() {
          var img = document.querySelector('img');
          if (img && img.complete) {
            setTimeout(function() { window.print(); }, 300);
          } else if (img) {
            img.onload = function() { setTimeout(function() { window.print(); }, 300); };
            img.onerror = function() { setTimeout(function() { window.print(); }, 300); };
          } else {
            setTimeout(function() { window.print(); }, 300);
          }
        }
      </script>
    </body>
    </html>
  `)
  ventana.document.close()
}

const TicketsPage = ({ onNavegar }: Props) => {
  const { data } = useQuery<{ tickets: Ticket[] }>(GET_TICKETS, { fetchPolicy: 'network-only' })
  const tickets  = (data?.tickets || []).filter(t => t.estado === 'pagado')
  const hoy      = new Date().toDateString()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Tickets</h1>
        <p className="text-slate-500 text-sm mt-1">Tickets de pasajes pagados</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total pagados', valor: tickets.length,                                                                         color: 'text-green-700' },
          { label: 'Pagados hoy',   valor: tickets.filter(t => new Date(t.fechaPago).toDateString() === hoy).length,               color: 'text-blue-700'  },
          { label: 'Pago efectivo', valor: tickets.filter(t => t.metodoPago === 'efectivo').length,                                color: 'text-slate-700' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className={`text-3xl font-bold mt-1 ${item.color}`}>{item.valor}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Código Ticket</th>
              <th className="px-4 py-3">Pasajero</th>
              <th className="px-4 py-3">Vuelo</th>
              <th className="px-4 py-3">Asiento</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Efectivo / Vuelto</th>
              <th className="px-4 py-3">Fecha Pago</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.idTicket} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-blue-800">{t.codigoTicket}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{t.idReserva.idCliente.nombreCompleto}</div>
                  <div className="text-xs text-slate-400">{t.idReserva.idCliente.nroDocumento}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{t.idReserva.idAsientoVuelo.idProgramacion.codigoVuelo}</div>
                  <div className="text-xs text-slate-400">
                    {t.idReserva.idAsientoVuelo.idProgramacion.idRuta.idAeropuertoOrigen.codigo} → {t.idReserva.idAsientoVuelo.idProgramacion.idRuta.idAeropuertoDestino.codigo}
                  </div>
                  <div className="text-xs text-slate-400">
                    {t.idReserva.idAsientoVuelo.idProgramacion.fechaSalida} {t.idReserva.idAsientoVuelo.idProgramacion.horaSalida}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CLASE_COLOR[t.idReserva.idAsientoVuelo.idAsiento.clase]}`}>
                    {t.idReserva.idAsientoVuelo.idAsiento.numero} — {CLASE_LABEL[t.idReserva.idAsientoVuelo.idAsiento.clase]}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">Bs. {t.precio}</td>
                <td className="px-4 py-3">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                    {METODO_LABEL[t.metodoPago] || t.metodoPago}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {t.montoRecibido != null ? (
                    <div>
                      <div>Recibido: <span className="font-medium">Bs. {t.montoRecibido}</span></div>
                      <div>Vuelto: <span className="font-medium text-blue-700">Bs. {t.vuelto}</span></div>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{fmtDateTime(t.fechaPago)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleImprimir(t)}
                    className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-semibold transition">
                    🖨 Imprimir
                  </button>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-400 text-sm">No hay tickets pagados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TicketsPage