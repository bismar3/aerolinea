import { gql } from '@apollo/client'

export const ABRIR_SALIDA_MUTATION = gql`
  mutation AbrirSalida($idProgramacion: Int!) {
    abrirSalida(idProgramacion: $idProgramacion) {
      ok mensaje
      salida { idSalida estado totalPasajeros }
    }
  }
`

export const MARCAR_ABORDAJE_MUTATION = gql`
  mutation MarcarAbordaje($idDetalle: Int!, $abordado: Boolean!) {
    marcarAbordaje(idDetalle: $idDetalle, abordado: $abordado) {
      ok mensaje
      detalle { idDetalle abordado horaAbordaje }
    }
  }
`

export const CERRAR_SALIDA_MUTATION = gql`
  mutation CerrarSalida($idSalida: Int!) {
    cerrarSalida(idSalida: $idSalida) {
      ok mensaje
      salida { idSalida estado fechaSalidaReal horaSalidaReal }
    }
  }
`

export const CANCELAR_VUELO_MUTATION = gql`
  mutation CancelarVuelo($idProgramacion: Int!, $motivoCancelacion: String!, $observaciones: String) {
    cancelarVuelo(idProgramacion: $idProgramacion, motivoCancelacion: $motivoCancelacion, observaciones: $observaciones) {
      ok mensaje totalDevoluciones
    }
  }
`

export const PROCESAR_DEVOLUCION_MUTATION = gql`
  mutation ProcesarDevolucion($idDevolucion: Int!, $observaciones: String) {
    procesarDevolucion(idDevolucion: $idDevolucion, observaciones: $observaciones) {
      ok mensaje
      devolucion { idDevolucion estado fechaProcesado }
    }
  }
`