import graphene
import re
from django.utils import timezone
from datetime import timedelta
from seguridad.models import Rol, Permiso, RolPermiso, Usuario, RolPermisoUsuario
from .queries import (
    RolType, PermisoType, RolPermisoType,
    UsuarioType, RolPermisoUsuarioType
)

def validar_password(password):
    errores = []
    if len(password) < 8:
        errores.append("Mínimo 8 caracteres")
    if not re.search(r'[A-Z]', password):
        errores.append("Debe tener al menos una mayúscula")
    if not re.search(r'[a-z]', password):
        errores.append("Debe tener al menos una minúscula")
    if not re.search(r'[0-9]', password):
        errores.append("Debe tener al menos un número")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errores.append("Debe tener al menos un carácter especial")
    return errores

# ── ROL ───────────────────────────────────
class CrearRol(graphene.Mutation):
    class Arguments:
        nombre = graphene.String(required=True)
        descripcion = graphene.String()

    rol = graphene.Field(RolType)
    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, nombre, descripcion=''):
        rol = Rol.objects.create(nombre=nombre, descripcion=descripcion)
        return CrearRol(rol=rol, ok=True, mensaje="Rol creado correctamente")

class EliminarRol(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id):
        Rol.objects.get(pk=id).delete()
        return EliminarRol(ok=True, mensaje="Rol eliminado correctamente")

# ── PERMISO ───────────────────────────────
class CrearPermiso(graphene.Mutation):
    class Arguments:
        nombre = graphene.String(required=True)
        descripcion = graphene.String()

    permiso = graphene.Field(PermisoType)
    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, nombre, descripcion=''):
        permiso = Permiso.objects.create(nombre=nombre, descripcion=descripcion)
        return CrearPermiso(permiso=permiso, ok=True, mensaje="Permiso creado correctamente")

class EliminarPermiso(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id):
        Permiso.objects.get(pk=id).delete()
        return EliminarPermiso(ok=True, mensaje="Permiso eliminado correctamente")

# ── ROL PERMISO ───────────────────────────
class AsignarRolPermiso(graphene.Mutation):
    class Arguments:
        id_rol = graphene.Int(required=True)
        id_permiso = graphene.Int(required=True)

    rol_permiso = graphene.Field(RolPermisoType)
    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id_rol, id_permiso):
        rol = Rol.objects.get(pk=id_rol)
        permiso = Permiso.objects.get(pk=id_permiso)
        rol_permiso = RolPermiso.objects.create(rol=rol, permiso=permiso)
        return AsignarRolPermiso(
            rol_permiso=rol_permiso,
            ok=True,
            mensaje=f"Permiso '{permiso.nombre}' asignado al rol '{rol.nombre}'"
        )

class EliminarRolPermiso(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id):
        RolPermiso.objects.get(pk=id).delete()
        return EliminarRolPermiso(ok=True, mensaje="Asignación eliminada correctamente")

# ── USUARIO ───────────────────────────────
class CrearUsuario(graphene.Mutation):
    class Arguments:
        user_name = graphene.String(required=True)
        correo_electronico = graphene.String(required=True)
        contrasena = graphene.String(required=True)

    usuario = graphene.Field(UsuarioType)
    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, user_name, correo_electronico, contrasena):
        errores = validar_password(contrasena)
        if errores:
            return CrearUsuario(ok=False, mensaje=" | ".join(errores))
        usuario = Usuario(
            user_name=user_name,
            correo_electronico=correo_electronico
        )
        usuario.set_password(contrasena)
        usuario.save()
        return CrearUsuario(
            usuario=usuario,
            ok=True,
            mensaje="Usuario creado exitosamente"
        )

class EliminarUsuario(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id):
        Usuario.objects.get(pk=id).delete()
        return EliminarUsuario(ok=True, mensaje="Usuario eliminado correctamente")

# ── ROL PERMISO USUARIO ───────────────────
class AsignarRolPermisoUsuario(graphene.Mutation):
    class Arguments:
        id_usuario = graphene.Int(required=True)
        id_rol_permiso = graphene.Int(required=True)

    rol_permiso_usuario = graphene.Field(RolPermisoUsuarioType)
    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id_usuario, id_rol_permiso):
        usuario = Usuario.objects.get(pk=id_usuario)
        rol_permiso = RolPermiso.objects.get(pk=id_rol_permiso)
        rpu = RolPermisoUsuario.objects.create(
            usuario=usuario,
            rol_permiso=rol_permiso
        )
        return AsignarRolPermisoUsuario(
            rol_permiso_usuario=rpu,
            ok=True,
            mensaje="Rol y permiso asignado correctamente"
        )

class EliminarRolPermisoUsuario(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id):
        RolPermisoUsuario.objects.get(pk=id).delete()
        return EliminarRolPermisoUsuario(ok=True, mensaje="Asignación eliminada correctamente")

# ── LOGIN ─────────────────────────────────
class Login(graphene.Mutation):
    class Arguments:
        user_name = graphene.String(required=True)
        contrasena = graphene.String(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()
    usuario = graphene.Field(UsuarioType)
    permisos = graphene.List(graphene.String)

    def mutate(self, info, user_name, contrasena):
        try:
            usuario = Usuario.objects.get(user_name=user_name)

            if usuario.bloqueado_hasta and usuario.bloqueado_hasta > timezone.now():
                tiempo = (usuario.bloqueado_hasta - timezone.now()).seconds // 60
                return Login(
                    ok=False,
                    mensaje=f"Usuario bloqueado. Intente en {tiempo} minutos"
                )

            if not usuario.check_password(contrasena):
                usuario.intentos_fallidos += 1
                if usuario.intentos_fallidos >= 3:
                    usuario.bloqueado_hasta = timezone.now() + timedelta(minutes=15)
                    usuario.save()
                    return Login(
                        ok=False,
                        mensaje="Usuario bloqueado 15 minutos por múltiples intentos fallidos"
                    )
                usuario.save()
                restantes = 3 - usuario.intentos_fallidos
                return Login(
                    ok=False,
                    mensaje=f"Contraseña incorrecta. {restantes} intentos restantes"
                )

            usuario.intentos_fallidos = 0
            usuario.bloqueado_hasta = None
            usuario.save()

            permisos = list(RolPermisoUsuario.objects.filter(
                usuario=usuario
            ).values_list('rol_permiso__permiso__nombre', flat=True))

            return Login(
                ok=True,
                mensaje="Login exitoso",
                usuario=usuario,
                permisos=permisos
            )

        except Usuario.DoesNotExist:
            return Login(ok=False, mensaje="Usuario no encontrado")

# ── MUTATION CLASS ────────────────────────
class Mutation(graphene.ObjectType):
    crear_rol = CrearRol.Field()
    eliminar_rol = EliminarRol.Field()
    crear_permiso = CrearPermiso.Field()
    eliminar_permiso = EliminarPermiso.Field()
    asignar_rol_permiso = AsignarRolPermiso.Field()
    eliminar_rol_permiso = EliminarRolPermiso.Field()
    crear_usuario = CrearUsuario.Field()
    eliminar_usuario = EliminarUsuario.Field()
    asignar_rol_permiso_usuario = AsignarRolPermisoUsuario.Field()
    eliminar_rol_permiso_usuario = EliminarRolPermisoUsuario.Field()
    login = Login.Field()