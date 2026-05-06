import { gql } from '@apollo/client'  // ← cambiar

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export const LOGIN_MUTATION = gql`
  mutation LoginUsuario($username: String!, $password: String!) {
    loginUsuario(username: $username, password: $password) {
      ok
      mensaje
      permisos
      usuario {
        idUsuario
        nombreCompleto
        username
        correo
        idRol { idRol nombre }
      }
    }
  }
`

export const LOGIN_PASAJERO_MUTATION = gql`
  mutation LoginPasajero($correo: String!, $password: String!) {
    loginPasajero(correo: $correo, password: $password) {
      ok
      mensaje
      usuario { idUsuario username correo }
      pasajero { idPasajero nombre apellidoPaterno correo }
    }
  }
`

// ── ROLES ─────────────────────────────────────────────────────────────────────
export const CREAR_ROL_MUTATION = gql`
  mutation CrearRol($nombre: String!, $descripcion: String) {
    crearRol(nombre: $nombre, descripcion: $descripcion) {
      ok
      mensaje
      rol { idRol nombre descripcion estado }
    }
  }
`

export const ACTUALIZAR_ROL_MUTATION = gql`
  mutation ActualizarRol($idRol: Int!, $nombre: String, $descripcion: String, $estado: String) {
    actualizarRol(idRol: $idRol, nombre: $nombre, descripcion: $descripcion, estado: $estado) {
      ok
      mensaje
      rol { idRol nombre descripcion estado }
    }
  }
`

export const ELIMINAR_ROL_MUTATION = gql`
  mutation EliminarRol($idRol: Int!) {
    eliminarRol(idRol: $idRol) {
      ok
      mensaje
    }
  }
`

// ── PERMISOS ──────────────────────────────────────────────────────────────────
export const CREAR_PERMISO_MUTATION = gql`
  mutation CrearPermiso($nombre: String!, $descripcion: String) {
    crearPermiso(nombre: $nombre, descripcion: $descripcion) {
      ok
      mensaje
      permiso { idPermiso nombre descripcion estado }
    }
  }
`

export const ELIMINAR_PERMISO_MUTATION = gql`
  mutation EliminarPermiso($idPermiso: Int!) {
    eliminarPermiso(idPermiso: $idPermiso) {
      ok
      mensaje
    }
  }
`

// ── USUARIOS ──────────────────────────────────────────────────────────────────
export const CREAR_USUARIO_MUTATION = gql`
  mutation CrearUsuario(
    $nombre: String!
    $username: String!
    $correo: String!
    $password: String!
    $paterno: String
    $materno: String
    $telefono: String
    $idRol: Int
  ) {
    crearUsuario(
      nombre: $nombre
      username: $username
      correo: $correo
      password: $password
      paterno: $paterno
      materno: $materno
      telefono: $telefono
      idRol: $idRol
    ) {
      ok
      mensaje
      usuario {
        idUsuario
        nombreCompleto
        username
        correo
        idRol { idRol nombre }
      }
    }
  }
`

export const ACTUALIZAR_USUARIO_MUTATION = gql`
  mutation ActualizarUsuario(
    $idUsuario: Int!
    $nombre: String
    $paterno: String
    $materno: String
    $telefono: String
    $estado: String
  ) {
    actualizarUsuario(
      idUsuario: $idUsuario
      nombre: $nombre
      paterno: $paterno
      materno: $materno
      telefono: $telefono
      estado: $estado
    ) {
      ok
      mensaje
      usuario {
        idUsuario
        nombreCompleto
        username
        correo
        estado
        idRol { idRol nombre }
      }
    }
  }
`

export const ELIMINAR_USUARIO_MUTATION = gql`
  mutation EliminarUsuario($idUsuario: Int!) {
    eliminarUsuario(idUsuario: $idUsuario) {
      ok
      mensaje
    }
  }
`

export const CAMBIAR_PASSWORD_MUTATION = gql`
  mutation CambiarPassword($idUsuario: Int!, $passwordNew: String!) {
    cambiarPassword(idUsuario: $idUsuario, passwordNew: $passwordNew) {
      ok
      mensaje
    }
  }
`

// ── ASIGNACIONES ──────────────────────────────────────────────────────────────
export const ASIGNAR_ROL_USUARIO_MUTATION = gql`
  mutation AsignarRolAUsuario($idUsuario: Int!, $idRol: Int!) {
    asignarRolAUsuario(idUsuario: $idUsuario, idRol: $idRol) {
      ok
      mensaje
      usuario {
        idUsuario
        nombreCompleto
        idRol { idRol nombre }
      }
    }
  }
`

export const ASIGNAR_PERMISO_USUARIO_MUTATION = gql`
  mutation AsignarPermisoAUsuario($idUsuario: Int!, $idPermiso: Int!) {
    asignarPermisoAUsuario(idUsuario: $idUsuario, idPermiso: $idPermiso) {
      ok
      mensaje
    }
  }
`

export const ELIMINAR_PERMISO_USUARIO_MUTATION = gql`
  mutation EliminarPermisoUsuario($idRolPermisoUsuario: Int!) {
    eliminarPermisoUsuario(idRolPermisoUsuario: $idRolPermisoUsuario) {
      ok
      mensaje
    }
  }
`

// ── PASAJERO ──────────────────────────────────────────────────────────────────
export const REGISTRAR_PASAJERO_MUTATION = gql`
  mutation RegistrarPasajero(
    $nombre: String!
    $apellidoPaterno: String!
    $apellidoMaterno: String
    $correo: String!
    $password: String!
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
      correo: $correo
      password: $password
      numTelefono: $numTelefono
      nacionalidad: $nacionalidad
      tipoDocumento: $tipoDocumento
      nroDocumento: $nroDocumento
      fechaNacimiento: $fechaNacimiento
    ) {
      ok
      mensaje
      pasajero {
        idPasajero
        nombre
        apellidoPaterno
        correo
      }
    }
  }
`