import { gql } from '@apollo/client';

export const GET_USUARIOS = gql`
  query GetUsuarios {
    allUsuarios {
      id
      userName
      correoElectronico
      estado
      fechaCreacion
    }
  }
`;

export const GET_ROLES = gql`
  query GetRoles {
    allRoles {
      id
      nombre
      descripcion
    }
  }
`;

export const GET_PERMISOS = gql`
  query GetPermisos {
    allPermisos {
      id
      nombre
      descripcion
    }
  }
`;

export const GET_ROL_PERMISOS = gql`
  query GetRolPermisos {
    allRolPermisos {
      id
      rol {
        id
        nombre
      }
      permiso {
        id
        nombre
      }
    }
  }
`;

export const GET_ROL_PERMISO_USUARIOS = gql`
  query GetRolPermisoUsuarios {
    allRolPermisoUsuarios {
      id
      usuario {
        id
        userName
      }
      rolPermiso {
        id
        rol {
          nombre
        }
        permiso {
          nombre
        }
      }
    }
  }
`;