import { gql } from '@apollo/client'

export const CREAR_EGRESO_MANUAL_MUTATION = gql`
  mutation CrearEgresoManual($concepto: String!, $monto: Float!, $tipo: String, $observaciones: String) {
    crearEgresoManual(concepto: $concepto, monto: $monto, tipo: $tipo, observaciones: $observaciones) {
      ok
      mensaje
      egreso {
        idEgreso
        concepto
        monto
        tipo
        fecha
      }
    }
  }
`