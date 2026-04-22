import { gql } from '@apollo/client';

export const GET_AEROPUERTOS = gql`
  query GetAeropuertos {
    allAeropuertos {
      id
      nombre
      codigo
      ciudad
      tipo
    }
  }
`;

export const GET_RUTAS = gql`
  query GetRutas {
    allRutas {
      id
      distanciaKm
      duracionHr
      estado
      tipo
      idAeropuertoOrigen {
        id
        nombre
        codigo
        ciudad
      }
      idAeropuertoDestino {
        id
        nombre
        codigo
        ciudad
      }
    }
  }
`;

export const GET_PROGRAMACIONES = gql`
  query GetProgramaciones {
    allProgramaciones {
      id
      codigoVuelo
      fechaSalida
      fechaLlegada
      horaSalida
      horaLlegada
      asientosDisponible
      asientoVendido
      precioBase
      estado
      idRuta {
        id
        idAeropuertoOrigen { nombre codigo }
        idAeropuertoDestino { nombre codigo }
      }
      idAeronave {
        id
        codigoAeronave
        modelo
      }
    }
  }
`;