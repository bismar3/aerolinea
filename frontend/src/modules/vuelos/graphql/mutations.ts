import { gql } from '@apollo/client';

export const CREAR_AEROPUERTO_MUTATION = gql`
  mutation CrearAeropuerto(
    $nombre: String!
    $codigo: String!
    $ciudad: String!
    $tipo: String
  ) {
    crearAeropuerto(
      nombre: $nombre
      codigo: $codigo
      ciudad: $ciudad
      tipo: $tipo
    ) {
      ok
      mensaje
      aeropuerto {
        id
        nombre
        codigo
        ciudad
        tipo
      }
    }
  }
`;

export const ELIMINAR_AEROPUERTO_MUTATION = gql`
  mutation EliminarAeropuerto($id: Int!) {
    eliminarAeropuerto(id: $id) {
      ok
      mensaje
    }
  }
`;

export const CREAR_RUTA_MUTATION = gql`
  mutation CrearRuta(
    $idAeropuertoOrigen: Int!
    $idAeropuertoDestino: Int!
    $distanciaKm: Float
    $duracionHr: Float
    $estado: String
    $tipo: String
  ) {
    crearRuta(
      idAeropuertoOrigen: $idAeropuertoOrigen
      idAeropuertoDestino: $idAeropuertoDestino
      distanciaKm: $distanciaKm
      duracionHr: $duracionHr
      estado: $estado
      tipo: $tipo
    ) {
      ok
      mensaje
      ruta {
        id
      }
    }
  }
`;

export const CREAR_PROGRAMACION_VUELO_MUTATION = gql`
  mutation CrearProgramacionVuelo(
    $codigoVuelo: String!
    $idRuta: Int!
    $idAeronave: Int!
    $idItinerario: Int!
    $fechaSalida: DateTime!
    $fechaLlegada: DateTime!
    $horaSalida: Time!
    $horaLlegada: Time!
    $precioBase: Float!
    $asientosDisponible: Int
    $estado: String
  ) {
    crearProgramacionVuelo(
      codigoVuelo: $codigoVuelo
      idRuta: $idRuta
      idAeronave: $idAeronave
      idItinerario: $idItinerario
      fechaSalida: $fechaSalida
      fechaLlegada: $fechaLlegada
      horaSalida: $horaSalida
      horaLlegada: $horaLlegada
      precioBase: $precioBase
      asientosDisponible: $asientosDisponible
      estado: $estado
    ) {
      ok
      mensaje
      programacion {
        id
        codigoVuelo
      }
    }
  }
`;