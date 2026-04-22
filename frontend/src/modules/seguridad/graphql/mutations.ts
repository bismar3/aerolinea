import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($userName: String!, $contrasena: String!) {
    login(userName: $userName, contrasena: $contrasena) {
      ok
      mensaje
      permisos
      usuario {
        id
        userName
        correoElectronico
        estado
      }
    }
  }
`;

export const LOGIN_PASAJERO_MUTATION = gql`
  mutation LoginPasajero($correoElectronico: String!, $contrasena: String!) {
    loginPasajero(correoElectronico: $correoElectronico, contrasena: $contrasena) {
      ok
      mensaje
      pasajero {
        id
        nombre
        apellidoPaterno
        correoElectronico
      }
      usuario {
        id
        userName
      }
    }
  }
`;

export const CREAR_USUARIO_MUTATION = gql`
  mutation CrearUsuario(
    $userName: String!
    $correoElectronico: String!
    $contrasena: String!
  ) {
    crearUsuario(
      userName: $userName
      correoElectronico: $correoElectronico
      contrasena: $contrasena
    ) {
      ok
      mensaje
      usuario {
        id
        userName
        correoElectronico
      }
    }
  }
`;

export const ACTUALIZAR_USUARIO_MUTATION = gql`
  mutation ActualizarUsuario(
    $id: Int!
    $userName: String
    $correoElectronico: String
  ) {
    actualizarUsuario(
      id: $id
      userName: $userName
      correoElectronico: $correoElectronico
    ) {
      ok
      mensaje
      usuario {
        id
        userName
        correoElectronico
      }
    }
  }
`;

export const ELIMINAR_USUARIO_MUTATION = gql`
  mutation EliminarUsuario($id: Int!) {
    eliminarUsuario(id: $id) {
      ok
      mensaje
    }
  }
`;

export const CREAR_ROL_MUTATION = gql`
  mutation CrearRol($nombre: String!, $descripcion: String) {
    crearRol(nombre: $nombre, descripcion: $descripcion) {
      ok
      mensaje
      rol {
        id
        nombre
        descripcion
      }
    }
  }
`;

export const ELIMINAR_ROL_MUTATION = gql`
  mutation EliminarRol($id: Int!) {
    eliminarRol(id: $id) {
      ok
      mensaje
    }
  }
`;

export const CREAR_PERMISO_MUTATION = gql`
  mutation CrearPermiso($nombre: String!, $descripcion: String) {
    crearPermiso(nombre: $nombre, descripcion: $descripcion) {
      ok
      mensaje
      permiso {
        id
        nombre
        descripcion
      }
    }
  }
`;

export const ELIMINAR_PERMISO_MUTATION = gql`
  mutation EliminarPermiso($id: Int!) {
    eliminarPermiso(id: $id) {
      ok
      mensaje
    }
  }
`;

export const ASIGNAR_ROL_PERMISO_MUTATION = gql`
  mutation AsignarRolPermiso($idRol: Int!, $idPermiso: Int!) {
    asignarRolPermiso(idRol: $idRol, idPermiso: $idPermiso) {
      ok
      mensaje
      rolPermiso {
        id
      }
    }
  }
`;

export const ELIMINAR_ROL_PERMISO_MUTATION = gql`
  mutation EliminarRolPermiso($id: Int!) {
    eliminarRolPermiso(id: $id) {
      ok
      mensaje
    }
  }
`;

export const ASIGNAR_ROL_USUARIO_MUTATION = gql`
  mutation AsignarRolUsuario($idUsuario: Int!, $idRol: Int!) {
    asignarRolUsuario(idUsuario: $idUsuario, idRol: $idRol) {
      ok
      mensaje
    }
  }
`;

export const ASIGNAR_ROL_PERMISO_USUARIO_MUTATION = gql`
  mutation AsignarRolPermisoUsuario($idUsuario: Int!, $idRolPermiso: Int!) {
    asignarRolPermisoUsuario(idUsuario: $idUsuario, idRolPermiso: $idRolPermiso) {
      ok
      mensaje
    }
  }
`;

export const ELIMINAR_ROL_PERMISO_USUARIO_MUTATION = gql`
  mutation EliminarRolPermisoUsuario($id: Int!) {
    eliminarRolPermisoUsuario(id: $id) {
      ok
      mensaje
    }
  }
`;

export const REGISTRAR_PASAJERO_MUTATION = gql`
  mutation RegistrarPasajero(
    $nombre: String!
    $apellidoPaterno: String!
    $apellidoMaterno: String
    $correoElectronico: String!
    $contrasena: String!
    $numTelefono: String
    $nacionalidad: String
    $tipoDocumento: Int
    $nroDocumento: String!
    $fechaNacimiento: Date
  ) {
    registrarPasajero(
      nombre: $nombre
      apellidoPaterno: $apellidoPaterno
      apellidoMaterno: $apellidoMaterno
      correoElectronico: $correoElectronico
      contrasena: $contrasena
      numTelefono: $numTelefono
      nacionalidad: $nacionalidad
      tipoDocumento: $tipoDocumento
      nroDocumento: $nroDocumento
      fechaNacimiento: $fechaNacimiento
    ) {
      ok
      mensaje
      pasajero {
        id
        nombre
        apellidoPaterno
        correoElectronico
      }
    }
  }
`;