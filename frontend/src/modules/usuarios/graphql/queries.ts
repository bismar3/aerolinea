import { gql } from '@apollo/client'  // ← cambiar
// ── USUARIOS ──────────────────────────────────────────────────────────────────
export const GET_USUARIOS = gql`
  query {
    usuarios {
      idUsuario
      nombreCompleto
      username
      correo
      telefono
      estado
      bloqueado
      intentosFallidos
      idRol { idRol nombre }
    }
  }
`

export const GET_ROLES = gql`
  query {
    roles {
      idRol
      nombre
      descripcion
      estado
    }
  }
`

export const GET_PERMISOS = gql`
  query {
    permisos {
      idPermiso
      nombre
      descripcion
      estado
    }
  }
`

export const GET_TODOS_PERMISOS_USUARIO = gql`
  query {
    todosPermisosUsuario {
      idRolPermisoUsuario
      idUsuario { idUsuario username }
      idPermiso { idPermiso nombre }
    }
  }
`