import { gql } from '@apollo/client'

export const GET_SALIDAS_HOY = gql`
  query {
    salidasHoy {
      idSalida estado fechaSalidaReal horaSalidaReal
      motivoCancelacion observaciones
      porcentajeOcupacion cumpleMinimo
      totalAbordados totalPasajeros
      idProgramacion {
        idProgramacion codigoVuelo estado
        fechaSalida horaSalida fechaLlegada horaLlegada
        asientosDisponible asientoVendido ocupacionMinima
        idRuta {
          idAeropuertoOrigen { codigo ciudad }
          idAeropuertoDestino { codigo ciudad }
        }
        idAeronave { codigoAeronave modelo }
      }
    }
  }
`

export const GET_SALIDAS = gql`
  query {
    salidas {
      idSalida estado fechaSalidaReal horaSalidaReal
      motivoCancelacion observaciones
      porcentajeOcupacion cumpleMinimo
      totalAbordados totalPasajeros
      idProgramacion {
        idProgramacion codigoVuelo estado
        fechaSalida horaSalida fechaLlegada horaLlegada
        asientosDisponible asientoVendido ocupacionMinima
        idRuta {
          idAeropuertoOrigen { codigo ciudad }
          idAeropuertoDestino { codigo ciudad }
        }
        idAeronave { codigoAeronave modelo }
      }
    }
  }
`

export const GET_DETALLES_ABORDAJE = gql`
  query GetDetallesAbordaje($idSalida: Int!) {
    detallesAbordaje(idSalida: $idSalida) {
      idDetalle abordado horaAbordaje
      idReserva {
        idReserva codigoReserva
        idCliente { idCliente nombreCompleto nroDocumento }
        idAsientoVuelo {
          idAsiento { numero clase }
        }
      }
    }
  }
`

export const GET_DEVOLUCIONES = gql`
  query {
    devoluciones {
      idDevolucion motivo porcentajeReembolso
      montoOriginal montoReembolso estado
      observaciones fechaSolicitud fechaProcesado
      idTicket {
        idTicket codigoTicket
        idReserva {
          codigoReserva
          idCliente { nombreCompleto nroDocumento }
          idAsientoVuelo {
            idAsiento { numero clase }
            idProgramacion {
              codigoVuelo
              idRuta {
                idAeropuertoOrigen { codigo }
                idAeropuertoDestino { codigo }
              }
            }
          }
        }
      }
    }
  }
`

export const GET_DEVOLUCIONES_PENDIENTES = gql`
  query {
    devolucionesPendientes {
      idDevolucion motivo porcentajeReembolso
      montoOriginal montoReembolso estado
      observaciones fechaSolicitud
      idTicket {
        idTicket codigoTicket
        idReserva {
          codigoReserva
          idCliente { nombreCompleto nroDocumento }
          idAsientoVuelo {
            idAsiento { numero clase }
            idProgramacion {
              codigoVuelo
              idRuta {
                idAeropuertoOrigen { codigo }
                idAeropuertoDestino { codigo }
              }
            }
          }
        }
      }
    }
  }
`