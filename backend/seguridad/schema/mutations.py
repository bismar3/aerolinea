import graphene
import re
from django.utils import timezone
from datetime import timedelta
from seguridad.models import Rol, Permiso, RolPermiso, Usuario, RolPermisoUsuario, Pasajero
from .queries import (
    RolType, PermisoType, RolPermisoType,
    UsuarioType, RolPermisoUsuarioType, PasajeroType
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
        existe = RolPermiso.objects.filter(rol=rol, permiso=permiso).exists()
        if existe:
            return AsignarRolPermiso(
                ok=False,
                mensaje=f"El permiso '{permiso.nombre}' ya está asignado al rol '{rol.nombre}'"
            )
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
            correo_electronico=correo_electronico,
            tipo_usuario='trabajador'
        )
        usuario.set_password(contrasena)
        usuario.save()
        return CrearUsuario(
            usuario=usuario,
            ok=True,
            mensaje="Usuario creado exitosamente"
        )

class ActualizarUsuario(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)
        user_name = graphene.String()
        correo_electronico = graphene.String()

    usuario = graphene.Field(UsuarioType)
    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id, user_name=None, correo_electronico=None):
        try:
            usuario = Usuario.objects.get(pk=id)
            if user_name:
                usuario.user_name = user_name
            if correo_electronico:
                usuario.correo_electronico = correo_electronico
            usuario.save()
            return ActualizarUsuario(
                usuario=usuario,
                ok=True,
                mensaje="Usuario actualizado correctamente"
            )
        except Usuario.DoesNotExist:
            return ActualizarUsuario(ok=False, mensaje="Usuario no encontrado")

class EliminarUsuario(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id):
        Usuario.objects.get(pk=id).delete()
        return EliminarUsuario(ok=True, mensaje="Usuario eliminado correctamente")

# ── ROL PERMISO USUARIO ───────────────────
class AsignarRolUsuario(graphene.Mutation):
    class Arguments:
        id_usuario = graphene.Int(required=True)
        id_rol = graphene.Int(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id_usuario, id_rol):
        usuario = Usuario.objects.get(pk=id_usuario)
        rol = Rol.objects.get(pk=id_rol)
        rol_permisos = RolPermiso.objects.filter(rol=rol)
        count = 0
        for rp in rol_permisos:
            existe = RolPermisoUsuario.objects.filter(
                usuario=usuario,
                rol_permiso=rp
            ).exists()
            if not existe:
                RolPermisoUsuario.objects.create(
                    usuario=usuario,
                    rol_permiso=rp
                )
                count += 1
        return AsignarRolUsuario(
            ok=True,
            mensaje=f"Rol '{rol.nombre}' asignado con {count} permisos nuevos"
        )

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
        existe = RolPermisoUsuario.objects.filter(
            usuario=usuario,
            rol_permiso=rol_permiso
        ).exists()
        if existe:
            return AsignarRolPermisoUsuario(
                ok=False,
                mensaje="Este rol y permiso ya está asignado al usuario"
            )
        rpu = RolPermisoUsuario.objects.create(
            usuario=usuario,
            rol_permiso=rol_permiso
        )
        return AsignarRolPermisoUsuario(
            rol_permiso_usuario=rpu,
            ok=True,
            mensaje="Permiso asignado correctamente"
        )

class EliminarRolPermisoUsuario(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id):
        RolPermisoUsuario.objects.get(pk=id).delete()
        return EliminarRolPermisoUsuario(ok=True, mensaje="Asignación eliminada correctamente")

# ── LOGIN TRABAJADOR ──────────────────────
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
            usuario = Usuario.objects.get(
                user_name=user_name,
                tipo_usuario='trabajador'
            )
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

# ── REGISTRO PASAJERO ─────────────────────
class RegistrarPasajero(graphene.Mutation):
    class Arguments:
        nombre = graphene.String(required=True)
        apellido_paterno = graphene.String(required=True)
        apellido_materno = graphene.String()
        correo_electronico = graphene.String(required=True)
        contrasena = graphene.String(required=True)
        num_telefono = graphene.String()
        nacionalidad = graphene.String()
        tipo_documento = graphene.Int()
        nro_documento = graphene.String(required=True)
        fecha_nacimiento = graphene.Date()

    pasajero = graphene.Field(PasajeroType)
    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, nombre, apellido_paterno, correo_electronico,
               contrasena, nro_documento, apellido_materno='',
               num_telefono='', nacionalidad='', tipo_documento=1,
               fecha_nacimiento=None):
        errores = validar_password(contrasena)
        if errores:
            return RegistrarPasajero(ok=False, mensaje=" | ".join(errores))
        usuario = Usuario(
            user_name=correo_electronico,
            correo_electronico=correo_electronico,
            tipo_usuario='pasajero'
        )
        usuario.set_password(contrasena)
        usuario.save()
        pasajero = Pasajero.objects.create(
            nombre=nombre,
            apellido_paterno=apellido_paterno,
            apellido_materno=apellido_materno,
            correo_electronico=correo_electronico,
            num_telefono=num_telefono,
            nacionalidad=nacionalidad,
            tipo_documento=tipo_documento,
            nro_documento=nro_documento,
            fecha_nacimiento=fecha_nacimiento,
            usuario=usuario
        )
        return RegistrarPasajero(
            pasajero=pasajero,
            ok=True,
            mensaje="Pasajero registrado exitosamente"
        )

# ── LOGIN PASAJERO ────────────────────────
class LoginPasajero(graphene.Mutation):
    class Arguments:
        correo_electronico = graphene.String(required=True)
        contrasena = graphene.String(required=True)

    ok = graphene.Boolean()
    mensaje = graphene.String()
    pasajero = graphene.Field(PasajeroType)
    usuario = graphene.Field(UsuarioType)

    def mutate(self, info, correo_electronico, contrasena):
        try:
            usuario = Usuario.objects.get(
                correo_electronico=correo_electronico,
                tipo_usuario='pasajero'
            )
            if usuario.bloqueado_hasta and usuario.bloqueado_hasta > timezone.now():
                tiempo = (usuario.bloqueado_hasta - timezone.now()).seconds // 60
                return LoginPasajero(
                    ok=False,
                    mensaje=f"Usuario bloqueado. Intente en {tiempo} minutos"
                )
            if not usuario.check_password(contrasena):
                usuario.intentos_fallidos += 1
                if usuario.intentos_fallidos >= 3:
                    usuario.bloqueado_hasta = timezone.now() + timedelta(minutes=15)
                    usuario.save()
                    return LoginPasajero(
                        ok=False,
                        mensaje="Usuario bloqueado 15 minutos"
                    )
                usuario.save()
                restantes = 3 - usuario.intentos_fallidos
                return LoginPasajero(
                    ok=False,
                    mensaje=f"Contraseña incorrecta. {restantes} intentos restantes"
                )
            usuario.intentos_fallidos = 0
            usuario.bloqueado_hasta = None
            usuario.save()
            pasajero = Pasajero.objects.get(usuario=usuario)
            return LoginPasajero(
                ok=True,
                mensaje="Login exitoso",
                pasajero=pasajero,
                usuario=usuario
            )
        except Usuario.DoesNotExist:
            return LoginPasajero(ok=False, mensaje="Usuario no encontrado")
        except Pasajero.DoesNotExist:
            return LoginPasajero(ok=False, mensaje="Pasajero no encontrado")

# ── ACTUALIZAR PASAJERO ───────────────────
class ActualizarPasajero(graphene.Mutation):
    class Arguments:
        id = graphene.Int(required=True)
        correo_electronico = graphene.String()
        num_telefono = graphene.String()
        nacionalidad = graphene.String()

    pasajero = graphene.Field(PasajeroType)
    ok = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(self, info, id, correo_electronico=None,
               num_telefono=None, nacionalidad=None):
        try:
            pasajero = Pasajero.objects.get(pk=id)
            if correo_electronico:
                pasajero.correo_electronico = correo_electronico
            if num_telefono:
                pasajero.num_telefono = num_telefono
            if nacionalidad:
                pasajero.nacionalidad = nacionalidad
            pasajero.save()
            return ActualizarPasajero(
                pasajero=pasajero,
                ok=True,
                mensaje="Datos actualizados correctamente"
            )
        except Pasajero.DoesNotExist:
            return ActualizarPasajero(ok=False, mensaje="Pasajero no encontrado")

# ── MUTATION CLASS ────────────────────────
class Mutation(graphene.ObjectType):
    crear_rol = CrearRol.Field()
    eliminar_rol = EliminarRol.Field()
    crear_permiso = CrearPermiso.Field()
    eliminar_permiso = EliminarPermiso.Field()
    asignar_rol_permiso = AsignarRolPermiso.Field()
    eliminar_rol_permiso = EliminarRolPermiso.Field()
    crear_usuario = CrearUsuario.Field()
    actualizar_usuario = ActualizarUsuario.Field()
    eliminar_usuario = EliminarUsuario.Field()
    asignar_rol_usuario = AsignarRolUsuario.Field()
    asignar_rol_permiso_usuario = AsignarRolPermisoUsuario.Field()
    eliminar_rol_permiso_usuario = EliminarRolPermisoUsuario.Field()
    login = Login.Field()
    registrar_pasajero = RegistrarPasajero.Field()
    login_pasajero = LoginPasajero.Field()
    actualizar_pasajero = ActualizarPasajero.Field()