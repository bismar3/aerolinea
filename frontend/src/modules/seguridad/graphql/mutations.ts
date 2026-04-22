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

export const CREAR_ROL_MUTATION = gql`
  mutation CrearRol($nombre: String!, $descripcion: String) {
    crearRol(nombre: $nombre, descripcion: $descripcion) {
      ok
      mensaje
      rol {
        id
        nombre
      }
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
      }
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

export const ASIGNAR_ROL_PERMISO_USUARIO_MUTATION = gql`
  mutation AsignarRolPermisoUsuario($idUsuario: Int!, $idRolPermiso: Int!) {
    asignarRolPermisoUsuario(idUsuario: $idUsuario, idRolPermiso: $idRolPermiso) {
      ok
      mensaje
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

export const ELIMINAR_ROL_MUTATION = gql`
  mutation EliminarRol($id: Int!) {
    eliminarRol(id: $id) {
      ok
      mensaje
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