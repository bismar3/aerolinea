import { gql } from '@apollo/client'

export const GET_AEROPUERTOS = gql`
  query { aeropuertos { idAeropuerto nombre ciudad codigo tipo estado latitud longitud } }
`
export const GET_AERONAVES = gql`
  query { aeronaves { idAeronave codigoAeronave modelo tipoPasillo asientosEconomica asientosEconomicaPremium asientosEjecutiva asientosPrimeraClase totalAsientos estado } }
`
export const GET_ASIENTOS = gql`
  query GetAsientos($idAeronave: Int) {
    asientos(idAeronave: $idAeronave) {
      idAsiento numero fila clase estado
      idAeronave { idAeronave codigoAeronave modelo }
    }
  }
`
export const GET_RUTAS = gql`
  query { rutas { idRuta distanciaKm duracionHr tipo estado
    idAeropuertoOrigen { idAeropuerto nombre codigo ciudad }
    idAeropuertoDestino { idAeropuerto nombre codigo ciudad }
  }}
`
export const GET_ESCALAS = gql`
  query GetEscalas($idRuta: Int) {
    escalas(idRuta: $idRuta) {
      idEscala ciudad orden tiempoDuracion
      aeropuerto { idAeropuerto nombre codigo }
      idRuta { idRuta }
    }
  }
`
export const GET_PROGRAMACIONES = gql`
  query { programaciones {
    idProgramacion codigoVuelo fechaSalida horaSalida fechaLlegada horaLlegada
    asientosDisponible asientoVendido precioBase ocupacionMinima estado
    motivoCancelacion descripcionCancelacion
    idRuta { idRuta tipo
      idAeropuertoOrigen { nombre codigo ciudad }
      idAeropuertoDestino { nombre codigo ciudad }
    }
    idAeronave { idAeronave codigoAeronave modelo totalAsientos asientosEconomica asientosEconomicaPremium asientosEjecutiva asientosPrimeraClase }
  }}
`

// ── TRIPULACION ───────────────────────────────────────────────────────────────
export const GET_TRIPULANTES = gql`
  query { tripulantes { idTripulante nombre apellido ci cargo estado } }
`
export const GET_GRUPOS_TRIPULACION = gql`
  query { gruposTripulacion { idGrupo nombre estado totalTripulantes
    tripulantes { idTripulante nombre apellido cargo estado }
  }}
`
export const GET_ASIGNACIONES_GRUPO = gql`
  query { asignacionesGrupo { idAsignacion estado fechaAsignacion
    idGrupo { 
      idGrupo nombre estado
      tripulantes { idTripulante nombre apellido cargo estado }
    }
    idProgramacion { idProgramacion codigoVuelo estado
      idRuta { idAeropuertoOrigen { codigo ciudad } idAeropuertoDestino { codigo ciudad } }
    }
  }}
`

// ── REPROGRAMACION ────────────────────────────────────────────────────────────
export const GET_REPROGRAMACIONES = gql`
  query { reprogramaciones {
    idReprogramacion motivo descripcion estado
    nuevaFechaSalida nuevaHoraSalida
    fechaCreacion fechaActualizacion
    idProgramacion {
      idProgramacion codigoVuelo estado fechaSalida horaSalida
      motivoCancelacion
      idRuta {
        idAeropuertoOrigen { codigo ciudad }
        idAeropuertoDestino { codigo ciudad }
      }
    }
  }}
`
