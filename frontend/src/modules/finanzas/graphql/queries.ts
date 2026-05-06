import { gql } from '@apollo/client'

export const GET_INGRESOS = gql`
  query {
    ingresos {
      idIngreso
      concepto
      tipo
      monto
      fecha
      observaciones
      idTicket {
        idTicket
        codigoTicket
        idReserva {
          idCliente { nombreCompleto }
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

export const GET_EGRESOS = gql`
  query {
    egresos {
      idEgreso
      concepto
      tipo
      monto
      fecha
      observaciones
      idDevolucion
    }
  }
`

export const GET_RESUMEN_FINANCIERO = gql`
  query {
    resumenFinanciero {
      totalIngresos
      totalEgresos
      balance
      totalVentas
      totalDevoluciones
    }
  }
`

export const GET_INGRESOS_POR_FECHA = gql`
  query GetIngresosPorFecha($fechaInicio: Date!, $fechaFin: Date!) {
    ingresosPorFecha(fechaInicio: $fechaInicio, fechaFin: $fechaFin) {
      idIngreso
      concepto
      tipo
      monto
      fecha
    }
  }
`

export const GET_EGRESOS_POR_FECHA = gql`
  query GetEgresosPorFecha($fechaInicio: Date!, $fechaFin: Date!) {
    egresosPorFecha(fechaInicio: $fechaInicio, fechaFin: $fechaFin) {
      idEgreso
      concepto
      tipo
      monto
      fecha
    }
  }
`