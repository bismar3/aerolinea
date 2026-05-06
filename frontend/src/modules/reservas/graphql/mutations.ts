import { gql } from '@apollo/client'

export const CREAR_CLIENTE_MUTATION = gql`
  mutation CrearCliente(
    $nombre: String!, $apellidoPaterno: String!, $apellidoMaterno: String,
    $tipoDocumento: String!, $nroDocumento: String!,
    $correo: String, $telefono: String, $nacionalidad: String, $fechaNacimiento: Date
  ) {
    crearCliente(
      nombre: $nombre, apellidoPaterno: $apellidoPaterno, apellidoMaterno: $apellidoMaterno,
      tipoDocumento: $tipoDocumento, nroDocumento: $nroDocumento,
      correo: $correo, telefono: $telefono, nacionalidad: $nacionalidad, fechaNacimiento: $fechaNacimiento
    ) {
      ok mensaje
      cliente { idCliente nombreCompleto tipoDocumento nroDocumento correo telefono }
    }
  }
`

export const ACTUALIZAR_CLIENTE_MUTATION = gql`
  mutation ActualizarCliente(
    $idCliente: Int!, $nombre: String, $apellidoPaterno: String,
    $apellidoMaterno: String, $correo: String, $telefono: String, $nacionalidad: String
  ) {
    actualizarCliente(
      idCliente: $idCliente, nombre: $nombre, apellidoPaterno: $apellidoPaterno,
      apellidoMaterno: $apellidoMaterno, correo: $correo, telefono: $telefono, nacionalidad: $nacionalidad
    ) {
      ok mensaje
      cliente { idCliente nombreCompleto correo telefono }
    }
  }
`

export const CREAR_VENTA_MUTATION = gql`
  mutation CrearVenta($canal: String) {
    crearVenta(canal: $canal) {
      ok mensaje
      venta { idVenta codigoVenta canal estado total }
    }
  }
`

export const CREAR_RESERVA_MUTATION = gql`
  mutation CrearReserva($idCliente: Int!, $idAsientoVuelo: Int!, $canal: String, $idVenta: Int, $observaciones: String) {
    crearReserva(idCliente: $idCliente, idAsientoVuelo: $idAsientoVuelo, canal: $canal, idVenta: $idVenta, observaciones: $observaciones) {
      ok mensaje
      reserva { idReserva codigoReserva estado fechaExpiracion canal idVenta { idVenta codigoVenta } }
    }
  }
`

export const CANCELAR_RESERVA_MUTATION = gql`
  mutation CancelarReserva($idReserva: Int!, $motivo: String) {
    cancelarReserva(idReserva: $idReserva, motivo: $motivo) { ok mensaje }
  }
`

export const EDITAR_RESERVA_MUTATION = gql`
  mutation EditarReserva($idReserva: Int!, $idAsientoVuelo: Int!) {
    editarReserva(idReserva: $idReserva, idAsientoVuelo: $idAsientoVuelo) {
      ok mensaje
      reserva { idReserva codigoReserva estado }
    }
  }
`

export const CAMBIAR_RESERVA_CONFIRMADA_MUTATION = gql`
  mutation CambiarReservaConfirmada($idReserva: Int!, $idAsientoVuelo: Int!) {
    cambiarReservaConfirmada(idReserva: $idReserva, idAsientoVuelo: $idAsientoVuelo) {
      ok mensaje diferencia requierePago
      reserva { idReserva codigoReserva estado }
    }
  }
`

export const SOLICITAR_REEMBOLSO_MUTATION = gql`
  mutation SolicitarReembolso($idReserva: Int!) {
    solicitarReembolso(idReserva: $idReserva) {
      ok mensaje porcentaje montoReembolso motivoCancelacion
    }
  }
`

export const GENERAR_PAGO_QR_MUTATION = gql`
  mutation GenerarPagoQr($idReserva: Int!) {
    generarPagoQr(idReserva: $idReserva) {
      ok mensaje urlPago qrUrl idTransaccion
      ticket { idTicket codigoTicket precio estado }
    }
  }
`

export const CONFIRMAR_PAGO_EFECTIVO_MUTATION = gql`
  mutation ConfirmarPagoEfectivo(
    $idReserva: Int!, $montoRecibido: Float!,
    $b200: Int, $b100: Int, $b50: Int, $b20: Int,
    $b10: Int, $b5: Int, $b2: Int, $b1: Int
  ) {
    confirmarPagoEfectivo(
      idReserva: $idReserva, montoRecibido: $montoRecibido,
      b200: $b200, b100: $b100, b50: $b50, b20: $b20,
      b10: $b10, b5: $b5, b2: $b2, b1: $b1
    ) {
      ok mensaje vuelto
      ticket { idTicket codigoTicket precio metodoPago estado fechaPago montoRecibido vuelto }
    }
  }
`

export const CONFIRMAR_PAGO_VENTA_EFECTIVO_MUTATION = gql`
  mutation ConfirmarPagoVentaEfectivo(
    $idVenta: Int!, $montoRecibido: Float!,
    $b200: Int, $b100: Int, $b50: Int, $b20: Int,
    $b10: Int, $b5: Int, $b2: Int, $b1: Int
  ) {
    confirmarPagoVentaEfectivo(
      idVenta: $idVenta, montoRecibido: $montoRecibido,
      b200: $b200, b100: $b100, b50: $b50, b20: $b20,
      b10: $b10, b5: $b5, b2: $b2, b1: $b1
    ) {
      ok mensaje vuelto
      venta { idVenta codigoVenta estado total montoRecibido vuelto fechaPago }
    }
  }
`

export const CONFIRMAR_PAGO_VENTA_QR_MUTATION = gql`
  mutation ConfirmarPagoVentaQr($idVenta: Int!) {
    confirmarPagoVentaQr(idVenta: $idVenta) {
      ok mensaje urlPago qrUrl idTransaccion
      venta { idVenta codigoVenta estado total }
    }
  }
`