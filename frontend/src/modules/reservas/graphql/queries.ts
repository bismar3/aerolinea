import { gql } from '@apollo/client'

export const GET_CLIENTES = gql`
  query {
    clientes {
      idCliente nombreCompleto nombre apellidoPaterno apellidoMaterno
      tipoDocumento nroDocumento correo telefono nacionalidad fechaNacimiento
    }
  }
`

export const BUSCAR_CLIENTE = gql`
  query BuscarCliente($nroDocumento: String!) {
    buscarCliente(nroDocumento: $nroDocumento) {
      idCliente nombreCompleto nombre apellidoPaterno apellidoMaterno
      tipoDocumento nroDocumento correo telefono nacionalidad
    }
  }
`

export const GET_VENTAS = gql`
  query {
    ventas {
      idVenta codigoVenta canal metodoPago total estado
      montoRecibido vuelto fechaCreacion fechaPago
      totalReservas
      reservas {
        idReserva codigoReserva estado canal fechaReserva fechaPago
        idCliente { idCliente nombreCompleto nroDocumento }
        idAsientoVuelo {
          idAsientoVuelo estado
          idAsiento { numero clase }
          idProgramacion {
            codigoVuelo fechaSalida horaSalida
            idRuta {
              idAeropuertoOrigen { codigo ciudad }
              idAeropuertoDestino { codigo ciudad }
            }
          }
        }
      }
    }
  }
`

export const GET_RESERVAS = gql`
  query {
    reservas {
      idReserva codigoReserva canal
      fechaReserva fechaExpiracion fechaPago fechaCancelacion
      estado observaciones
      idVenta { idVenta codigoVenta }
      idCliente { idCliente nombreCompleto nroDocumento tipoDocumento }
      idAsientoVuelo {
        idAsientoVuelo estado
        idAsiento { idAsiento numero clase }
        idProgramacion {
          idProgramacion codigoVuelo fechaSalida horaSalida
          idRuta {
            idRuta
            idAeropuertoOrigen { codigo ciudad }
            idAeropuertoDestino { codigo ciudad }
          }
        }
      }
    }
  }
`

export const GET_TICKETS = gql`
  query {
    tickets {
      idTicket codigoTicket precio metodoPago
      idTransaccion urlPasarela qrUrl
      montoRecibido vuelto detalleEfectivo
      fechaEmision fechaPago estado
      idReserva {
        idReserva codigoReserva canal
        idCliente { idCliente nombreCompleto nroDocumento }
        idAsientoVuelo {
          idAsiento { numero clase }
          idProgramacion {
            codigoVuelo fechaSalida horaSalida
            idRuta {
              idAeropuertoOrigen { codigo ciudad }
              idAeropuertoDestino { codigo ciudad }
            }
          }
        }
      }
    }
  }
`

export const GET_ASIENTOS_VUELO_DISPONIBLES = gql`
  query GetAsientosVueloClase($idProgramacion: Int!, $clase: String!) {
    asientosVueloClase(idProgramacion: $idProgramacion, clase: $clase) {
      idAsientoVuelo estado
      idAsiento { idAsiento numero fila clase }
    }
  }
`

export const GET_CLASES_VUELO = gql`
  query GetClasesVuelo($idProgramacion: Int!) {
    clasesVuelo(idProgramacion: $idProgramacion) {
      clase total disponibles precioBase precioConOferta
    }
  }
`