import { gql } from '@apollo/client'

// ── AEROPUERTO ────────────────────────────────────────────────────────────────
export const CREAR_AEROPUERTO_MUTATION = gql`
  mutation CrearAeropuerto($nombre: String!, $ciudad: String!, $codigo: String!, $tipo: String, $latitud: Float, $longitud: Float) {
    crearAeropuerto(nombre: $nombre, ciudad: $ciudad, codigo: $codigo, tipo: $tipo, latitud: $latitud, longitud: $longitud) {
      ok mensaje
      aeropuerto { idAeropuerto nombre ciudad codigo tipo estado latitud longitud }
    }
  }
`
export const ACTUALIZAR_AEROPUERTO_MUTATION = gql`
  mutation ActualizarAeropuerto($idAeropuerto: Int!, $nombre: String, $ciudad: String, $codigo: String, $tipo: String, $estado: String, $latitud: Float, $longitud: Float) {
    actualizarAeropuerto(idAeropuerto: $idAeropuerto, nombre: $nombre, ciudad: $ciudad, codigo: $codigo, tipo: $tipo, estado: $estado, latitud: $latitud, longitud: $longitud) {
      ok mensaje
      aeropuerto { idAeropuerto nombre ciudad codigo tipo estado latitud longitud }
    }
  }
`
export const ELIMINAR_AEROPUERTO_MUTATION = gql`
  mutation EliminarAeropuerto($idAeropuerto: Int!) {
    eliminarAeropuerto(idAeropuerto: $idAeropuerto) { ok mensaje }
  }
`

// ── AERONAVE ──────────────────────────────────────────────────────────────────
export const CREAR_AERONAVE_MUTATION = gql`
  mutation CrearAeronave($codigoAeronave: String!, $modelo: String!, $tipoPasillo: String!, $asientosEconomica: Int!, $asientosEconomicaPremium: Int, $asientosEjecutiva: Int, $asientosPrimeraClase: Int) {
    crearAeronave(codigoAeronave: $codigoAeronave, modelo: $modelo, tipoPasillo: $tipoPasillo, asientosEconomica: $asientosEconomica, asientosEconomicaPremium: $asientosEconomicaPremium, asientosEjecutiva: $asientosEjecutiva, asientosPrimeraClase: $asientosPrimeraClase) {
      ok mensaje totalAsientos
      aeronave { idAeronave codigoAeronave modelo tipoPasillo asientosEconomica asientosEconomicaPremium asientosEjecutiva asientosPrimeraClase totalAsientos estado }
    }
  }
`
export const ACTUALIZAR_AERONAVE_MUTATION = gql`
  mutation ActualizarAeronave($idAeronave: Int!, $modelo: String, $estado: String) {
    actualizarAeronave(idAeronave: $idAeronave, modelo: $modelo, estado: $estado) {
      ok mensaje
      aeronave { idAeronave codigoAeronave modelo estado }
    }
  }
`
export const ELIMINAR_AERONAVE_MUTATION = gql`
  mutation EliminarAeronave($idAeronave: Int!) {
    eliminarAeronave(idAeronave: $idAeronave) { ok mensaje }
  }
`

// ── RUTA ──────────────────────────────────────────────────────────────────────
export const CREAR_RUTA_MUTATION = gql`
  mutation CrearRuta($idAeropuertoOrigen: Int!, $idAeropuertoDestino: Int!, $tipo: String) {
    crearRuta(idAeropuertoOrigen: $idAeropuertoOrigen, idAeropuertoDestino: $idAeropuertoDestino, tipo: $tipo) {
      ok mensaje distanciaKm duracionHr
      ruta { idRuta distanciaKm duracionHr tipo estado
        idAeropuertoOrigen { idAeropuerto nombre codigo ciudad }
        idAeropuertoDestino { idAeropuerto nombre codigo ciudad }
      }
    }
  }
`
export const ELIMINAR_RUTA_MUTATION = gql`
  mutation EliminarRuta($idRuta: Int!) {
    eliminarRuta(idRuta: $idRuta) { ok mensaje }
  }
`

// ── ESCALA ────────────────────────────────────────────────────────────────────
export const CREAR_ESCALA_MUTATION = gql`
  mutation CrearEscala($idRuta: Int!, $idAeropuerto: Int!, $ciudad: String!, $orden: Int!, $tiempoDuracion: Int) {
    crearEscala(idRuta: $idRuta, idAeropuerto: $idAeropuerto, ciudad: $ciudad, orden: $orden, tiempoDuracion: $tiempoDuracion) {
      ok mensaje
      escala { idEscala ciudad orden tiempoDuracion }
    }
  }
`
export const ELIMINAR_ESCALA_MUTATION = gql`
  mutation EliminarEscala($idEscala: Int!) {
    eliminarEscala(idEscala: $idEscala) { ok mensaje }
  }
`

// ── PROGRAMACION VUELO ────────────────────────────────────────────────────────
export const CREAR_PROGRAMACION_MUTATION = gql`
  mutation CrearProgramacionVuelo($idRuta: Int!, $idAeronave: Int!, $fechaSalida: Date!, $horaSalida: Time!, $fechaLlegada: Date!, $horaLlegada: Time!, $precioBase: Float!) {
    crearProgramacionVuelo(idRuta: $idRuta, idAeronave: $idAeronave, fechaSalida: $fechaSalida, horaSalida: $horaSalida, fechaLlegada: $fechaLlegada, horaLlegada: $horaLlegada, precioBase: $precioBase) {
      ok mensaje codigoVuelo
      programacion { idProgramacion codigoVuelo estado }
    }
  }
`
export const ACTUALIZAR_PROGRAMACION_MUTATION = gql`
  mutation ActualizarProgramacionVuelo(
    $idProgramacion: Int!, $estado: String, $precioBase: Float,
    $motivoCancelacion: String, $descripcionCancelacion: String
  ) {
    actualizarProgramacionVuelo(
      idProgramacion: $idProgramacion, estado: $estado, precioBase: $precioBase,
      motivoCancelacion: $motivoCancelacion, descripcionCancelacion: $descripcionCancelacion
    ) {
      ok mensaje
      programacion { idProgramacion codigoVuelo estado precioBase motivoCancelacion }
    }
  }
`
export const ELIMINAR_PROGRAMACION_MUTATION = gql`
  mutation EliminarProgramacionVuelo($idProgramacion: Int!) {
    eliminarProgramacionVuelo(idProgramacion: $idProgramacion) { ok mensaje }
  }
`

// ── TRIPULANTE ────────────────────────────────────────────────────────────────
export const CREAR_TRIPULANTE_MUTATION = gql`
  mutation CrearTripulante($nombre: String!, $apellido: String!, $ci: String!, $cargo: String!) {
    crearTripulante(nombre: $nombre, apellido: $apellido, ci: $ci, cargo: $cargo) {
      ok mensaje
      tripulante { idTripulante nombre apellido ci cargo estado }
    }
  }
`
export const ACTUALIZAR_TRIPULANTE_MUTATION = gql`
  mutation ActualizarTripulante($idTripulante: Int!, $nombre: String, $apellido: String, $ci: String, $cargo: String, $estado: String) {
    actualizarTripulante(idTripulante: $idTripulante, nombre: $nombre, apellido: $apellido, ci: $ci, cargo: $cargo, estado: $estado) {
      ok mensaje
      tripulante { idTripulante nombre apellido ci cargo estado }
    }
  }
`
export const ELIMINAR_TRIPULANTE_MUTATION = gql`
  mutation EliminarTripulante($idTripulante: Int!) {
    eliminarTripulante(idTripulante: $idTripulante) { ok mensaje }
  }
`

// ── GRUPO TRIPULACION ─────────────────────────────────────────────────────────
export const CREAR_GRUPO_MUTATION = gql`
  mutation CrearGrupo($nombre: String!) {
    crearGrupo(nombre: $nombre) {
      ok mensaje
      grupo { idGrupo nombre estado totalTripulantes }
    }
  }
`
export const AGREGAR_TRIPULANTE_GRUPO_MUTATION = gql`
  mutation AgregarTripulanteGrupo($idGrupo: Int!, $idTripulante: Int!) {
    agregarTripulanteGrupo(idGrupo: $idGrupo, idTripulante: $idTripulante) {
      ok mensaje
      grupo { idGrupo nombre estado totalTripulantes tripulantes { idTripulante nombre apellido cargo estado } }
    }
  }
`
export const QUITAR_TRIPULANTE_GRUPO_MUTATION = gql`
  mutation QuitarTripulanteGrupo($idGrupo: Int!, $idTripulante: Int!) {
    quitarTripulanteGrupo(idGrupo: $idGrupo, idTripulante: $idTripulante) {
      ok mensaje
      grupo { idGrupo nombre estado totalTripulantes tripulantes { idTripulante nombre apellido cargo estado } }
    }
  }
`
export const ELIMINAR_GRUPO_MUTATION = gql`
  mutation EliminarGrupo($idGrupo: Int!) {
    eliminarGrupo(idGrupo: $idGrupo) { ok mensaje }
  }
`

// ── ASIGNACION GRUPO ──────────────────────────────────────────────────────────
export const ASIGNAR_GRUPO_VUELO_MUTATION = gql`
  mutation AsignarGrupoVuelo($idGrupo: Int!, $idProgramacion: Int!) {
    asignarGrupoVuelo(idGrupo: $idGrupo, idProgramacion: $idProgramacion) {
      ok mensaje
      asignacion { idAsignacion estado fechaAsignacion
        idGrupo { idGrupo nombre }
        idProgramacion { idProgramacion codigoVuelo }
      }
    }
  }
`
export const LIBERAR_GRUPO_VUELO_MUTATION = gql`
  mutation LiberarGrupoVuelo($idAsignacion: Int!) {
    liberarGrupoVuelo(idAsignacion: $idAsignacion) { ok mensaje }
  }
`

// ── REPROGRAMACION ────────────────────────────────────────────────────────────
export const ACTUALIZAR_REPROGRAMACION_MUTATION = gql`
  mutation ActualizarReprogramacion($idReprogramacion: Int!, $estado: String, $nuevaFechaSalida: Date, $nuevaHoraSalida: Time, $descripcion: String) {
    actualizarReprogramacion(idReprogramacion: $idReprogramacion, estado: $estado, nuevaFechaSalida: $nuevaFechaSalida, nuevaHoraSalida: $nuevaHoraSalida, descripcion: $descripcion) {
      ok mensaje
      reprogramacion { idReprogramacion estado nuevaFechaSalida nuevaHoraSalida descripcion }
    }
  }
`