import graphene
import re
from usuarios.models import Rol, Permiso, Usuario, PoliticaContrasena, RolPermisoUsuario, Pasajero
from .queries import RolType, PermisoType, UsuarioType, RolPermisoUsuarioType, PasajeroType


def validar_password(password):
    politica = PoliticaContrasena.objects.filter(activo=True).first()
    errores  = []
    longitud  = politica.longitud_minima    if politica else 8
    mayuscula = politica.requiere_mayuscula if politica else True
    numero    = politica.requiere_numero    if politica else True
    especial  = politica.requiere_especial  if politica else False
    if len(password) < longitud:
        errores.append(f"Minimo {longitud} caracteres")
    if mayuscula and not re.search(r'[A-Z]', password):
        errores.append("Debe tener al menos una mayuscula")
    if numero and not re.search(r'[0-9]', password):
        errores.append("Debe tener al menos un numero")
    if especial and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errores.append("Debe tener al menos un caracter especial")
    return errores


# ── ROL ───────────────────────────────────────────────────────────────────────
class CrearRol(graphene.Mutation):
    class Arguments:
        nombre      = graphene.String(required=True)
        descripcion = graphene.String()

    rol     = graphene.Field(RolType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, nombre, descripcion=None):
        if Rol.objects.filter(nombre=nombre).exists():
            return CrearRol(ok=False, mensaje=f"Ya existe un rol con el nombre '{nombre}'")
        rol = Rol.objects.create(nombre=nombre, descripcion=descripcion)
        return CrearRol(rol=rol, ok=True, mensaje="Rol creado correctamente")


class ActualizarRol(graphene.Mutation):
    class Arguments:
        id_rol      = graphene.Int(required=True)
        nombre      = graphene.String()
        descripcion = graphene.String()
        estado      = graphene.String()

    rol     = graphene.Field(RolType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_rol, **kwargs):
        try:
            rol = Rol.objects.get(pk=id_rol)
            for key, value in kwargs.items():
                if value is not None:
                    setattr(rol, key, value)
            rol.save()
            return ActualizarRol(rol=rol, ok=True, mensaje="Rol actualizado correctamente")
        except Rol.DoesNotExist:
            return ActualizarRol(ok=False, mensaje="Rol no encontrado")


class EliminarRol(graphene.Mutation):
    class Arguments:
        id_rol = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_rol):
        try:
            Rol.objects.get(pk=id_rol).delete()
            return EliminarRol(ok=True, mensaje="Rol eliminado correctamente")
        except Rol.DoesNotExist:
            return EliminarRol(ok=False, mensaje="Rol no encontrado")


# ── PERMISO ───────────────────────────────────────────────────────────────────
class CrearPermiso(graphene.Mutation):
    class Arguments:
        nombre      = graphene.String(required=True)
        descripcion = graphene.String()

    permiso = graphene.Field(PermisoType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, nombre, descripcion=None):
        if Permiso.objects.filter(nombre=nombre).exists():
            return CrearPermiso(ok=False, mensaje=f"Ya existe un permiso con el nombre '{nombre}'")
        permiso = Permiso.objects.create(nombre=nombre, descripcion=descripcion)
        return CrearPermiso(permiso=permiso, ok=True, mensaje="Permiso creado correctamente")


class EliminarPermiso(graphene.Mutation):
    class Arguments:
        id_permiso = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_permiso):
        try:
            Permiso.objects.get(pk=id_permiso).delete()
            return EliminarPermiso(ok=True, mensaje="Permiso eliminado correctamente")
        except Permiso.DoesNotExist:
            return EliminarPermiso(ok=False, mensaje="Permiso no encontrado")


# ── USUARIO ───────────────────────────────────────────────────────────────────
class CrearUsuario(graphene.Mutation):
    class Arguments:
        nombre   = graphene.String(required=True)
        username = graphene.String(required=True)
        correo   = graphene.String(required=True)
        password = graphene.String(required=True)
        paterno  = graphene.String()
        materno  = graphene.String()
        telefono = graphene.String()
        id_rol   = graphene.Int()

    usuario = graphene.Field(UsuarioType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, nombre, username, correo, password,
               paterno=None, materno=None, telefono=None, id_rol=None):
        errores = validar_password(password)
        if errores:
            return CrearUsuario(ok=False, mensaje=" | ".join(errores))
        if Usuario.objects.filter(username=username).exists():
            return CrearUsuario(ok=False, mensaje=f"El username '{username}' ya esta en uso")
        if Usuario.objects.filter(correo=correo).exists():
            return CrearUsuario(ok=False, mensaje=f"El correo '{correo}' ya esta registrado")
        rol     = Rol.objects.get(pk=id_rol) if id_rol else None
        usuario = Usuario(
            nombre=nombre, username=username, correo=correo,
            paterno=paterno, materno=materno, telefono=telefono,
            id_rol=rol, tipo_usuario='trabajador'
        )
        usuario.set_password(password)
        usuario.save()
        return CrearUsuario(usuario=usuario, ok=True, mensaje="Usuario creado correctamente")


class ActualizarUsuario(graphene.Mutation):
    class Arguments:
        id_usuario = graphene.Int(required=True)
        nombre     = graphene.String()
        paterno    = graphene.String()
        materno    = graphene.String()
        telefono   = graphene.String()
        estado     = graphene.String()

    usuario = graphene.Field(UsuarioType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_usuario, **kwargs):
        try:
            usuario = Usuario.objects.get(pk=id_usuario)
            for key, value in kwargs.items():
                if value is not None:
                    setattr(usuario, key, value)
            usuario.save()
            return ActualizarUsuario(usuario=usuario, ok=True, mensaje="Usuario actualizado correctamente")
        except Usuario.DoesNotExist:
            return ActualizarUsuario(ok=False, mensaje="Usuario no encontrado")


class EliminarUsuario(graphene.Mutation):
    class Arguments:
        id_usuario = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_usuario):
        try:
            Usuario.objects.get(pk=id_usuario).delete()
            return EliminarUsuario(ok=True, mensaje="Usuario eliminado correctamente")
        except Usuario.DoesNotExist:
            return EliminarUsuario(ok=False, mensaje="Usuario no encontrado")


class CambiarPassword(graphene.Mutation):
    class Arguments:
        id_usuario   = graphene.Int(required=True)
        password_new = graphene.String(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_usuario, password_new):
        errores = validar_password(password_new)
        if errores:
            return CambiarPassword(ok=False, mensaje=" | ".join(errores))
        try:
            usuario = Usuario.objects.get(pk=id_usuario)
            usuario.set_password(password_new)
            usuario.save()
            return CambiarPassword(ok=True, mensaje="Contrasena actualizada correctamente")
        except Usuario.DoesNotExist:
            return CambiarPassword(ok=False, mensaje="Usuario no encontrado")


# ── ASIGNACIONES ─────────────────────────────────────────────────────────────
class AsignarRolAUsuario(graphene.Mutation):
    class Arguments:
        id_usuario = graphene.Int(required=True)
        id_rol     = graphene.Int(required=True)

    usuario = graphene.Field(UsuarioType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_usuario, id_rol):
        try:
            usuario        = Usuario.objects.get(pk=id_usuario)
            rol            = Rol.objects.get(pk=id_rol)
            usuario.id_rol = rol
            usuario.save()
            return AsignarRolAUsuario(usuario=usuario, ok=True, mensaje=f"Rol '{rol.nombre}' asignado correctamente")
        except Usuario.DoesNotExist:
            return AsignarRolAUsuario(ok=False, mensaje="Usuario no encontrado")
        except Rol.DoesNotExist:
            return AsignarRolAUsuario(ok=False, mensaje="Rol no encontrado")


class AsignarPermisoAUsuario(graphene.Mutation):
    class Arguments:
        id_usuario = graphene.Int(required=True)
        id_permiso = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_usuario, id_permiso):
        try:
            usuario = Usuario.objects.get(pk=id_usuario)
            permiso = Permiso.objects.get(pk=id_permiso)
            _, creado = RolPermisoUsuario.objects.get_or_create(
                id_usuario=usuario,
                id_permiso=permiso
            )
            if not creado:
                return AsignarPermisoAUsuario(ok=False, mensaje=f"El usuario ya tiene el permiso '{permiso.nombre}'")
            return AsignarPermisoAUsuario(ok=True, mensaje=f"Permiso '{permiso.nombre}' asignado correctamente")
        except Usuario.DoesNotExist:
            return AsignarPermisoAUsuario(ok=False, mensaje="Usuario no encontrado")
        except Permiso.DoesNotExist:
            return AsignarPermisoAUsuario(ok=False, mensaje="Permiso no encontrado")


class EliminarPermisoUsuario(graphene.Mutation):
    class Arguments:
        id_rol_permiso_usuario = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_rol_permiso_usuario):
        try:
            RolPermisoUsuario.objects.get(pk=id_rol_permiso_usuario).delete()
            return EliminarPermisoUsuario(ok=True, mensaje="Permiso eliminado del usuario correctamente")
        except RolPermisoUsuario.DoesNotExist:
            return EliminarPermisoUsuario(ok=False, mensaje="Registro no encontrado")


# ── LOGIN ─────────────────────────────────────────────────────────────────────
class LoginUsuario(graphene.Mutation):
    class Arguments:
        username = graphene.String(required=True)
        password = graphene.String(required=True)

    usuario  = graphene.Field(UsuarioType)
    ok       = graphene.Boolean()
    mensaje  = graphene.String()
    permisos = graphene.List(graphene.String)

    def mutate(root, info, username, password):
        try:
            usuario = Usuario.objects.select_related('id_rol').get(
                username=username, tipo_usuario='trabajador'
            )
            if usuario.esta_bloqueado():
                return LoginUsuario(ok=False, mensaje="Usuario bloqueado temporalmente. Intente mas tarde.")
            if usuario.check_password(password):
                usuario.resetear_intentos()
                permisos = list(
                    usuario.permisos_usuario
                    .select_related('id_permiso')
                    .values_list('id_permiso__nombre', flat=True)
                )
                return LoginUsuario(usuario=usuario, ok=True, mensaje="Login exitoso", permisos=permisos)
            else:
                usuario.registrar_intento_fallido()
                politica     = PoliticaContrasena.objects.filter(activo=True).first()
                max_intentos = politica.max_intentos if politica else 3
                restantes    = max_intentos - usuario.intentos_fallidos
                if usuario.bloqueado:
                    return LoginUsuario(ok=False, mensaje="Usuario bloqueado por multiples intentos fallidos")
                return LoginUsuario(ok=False, mensaje=f"Contrasena incorrecta. {max(restantes, 0)} intento(s) restante(s)")
        except Usuario.DoesNotExist:
            return LoginUsuario(ok=False, mensaje="Usuario no encontrado")


# ── PASAJERO ──────────────────────────────────────────────────────────────────
class RegistrarPasajero(graphene.Mutation):
    class Arguments:
        nombre           = graphene.String(required=True)
        apellido_paterno = graphene.String(required=True)
        apellido_materno = graphene.String()
        correo           = graphene.String(required=True)
        password         = graphene.String(required=True)
        num_telefono     = graphene.String()
        nacionalidad     = graphene.String()
        tipo_documento   = graphene.Int()
        nro_documento    = graphene.String(required=True)
        fecha_nacimiento = graphene.Date()

    pasajero = graphene.Field(PasajeroType)
    ok       = graphene.Boolean()
    mensaje  = graphene.String()

    def mutate(root, info, nombre, apellido_paterno, correo, password, nro_documento,
               apellido_materno='', num_telefono='', nacionalidad='',
               tipo_documento=1, fecha_nacimiento=None):
        errores = validar_password(password)
        if errores:
            return RegistrarPasajero(ok=False, mensaje=" | ".join(errores))
        if Usuario.objects.filter(correo=correo).exists():
            return RegistrarPasajero(ok=False, mensaje="El correo ya esta registrado")
        if Pasajero.objects.filter(nro_documento=nro_documento).exists():
            return RegistrarPasajero(ok=False, mensaje="El numero de documento ya esta registrado")
        usuario = Usuario(
            nombre=nombre, paterno=apellido_paterno,
            username=correo, correo=correo,
            tipo_usuario='pasajero'
        )
        usuario.set_password(password)
        usuario.save()
        pasajero = Pasajero.objects.create(
            nombre=nombre,
            apellido_paterno=apellido_paterno,
            apellido_materno=apellido_materno,
            correo=correo,
            num_telefono=num_telefono,
            nacionalidad=nacionalidad,
            tipo_documento=tipo_documento,
            nro_documento=nro_documento,
            fecha_nacimiento=fecha_nacimiento,
            id_usuario=usuario
        )
        return RegistrarPasajero(pasajero=pasajero, ok=True, mensaje="Pasajero registrado exitosamente")


class LoginPasajero(graphene.Mutation):
    class Arguments:
        correo   = graphene.String(required=True)
        password = graphene.String(required=True)

    pasajero = graphene.Field(PasajeroType)
    usuario  = graphene.Field(UsuarioType)
    ok       = graphene.Boolean()
    mensaje  = graphene.String()

    def mutate(root, info, correo, password):
        try:
            usuario = Usuario.objects.get(correo=correo, tipo_usuario='pasajero')
            if usuario.esta_bloqueado():
                return LoginPasajero(ok=False, mensaje="Usuario bloqueado temporalmente")
            if usuario.check_password(password):
                usuario.resetear_intentos()
                pasajero = Pasajero.objects.get(id_usuario=usuario)
                return LoginPasajero(pasajero=pasajero, usuario=usuario, ok=True, mensaje="Login exitoso")
            else:
                usuario.registrar_intento_fallido()
                return LoginPasajero(ok=False, mensaje="Credenciales incorrectas")
        except Usuario.DoesNotExist:
            return LoginPasajero(ok=False, mensaje="Usuario no encontrado")
        except Pasajero.DoesNotExist:
            return LoginPasajero(ok=False, mensaje="Pasajero no encontrado")


# ── MUTATION CLASS ────────────────────────────────────────────────────────────
class Mutation(graphene.ObjectType):
    crear_rol                 = CrearRol.Field()
    actualizar_rol            = ActualizarRol.Field()
    eliminar_rol              = EliminarRol.Field()
    crear_permiso             = CrearPermiso.Field()
    eliminar_permiso          = EliminarPermiso.Field()
    crear_usuario             = CrearUsuario.Field()
    actualizar_usuario        = ActualizarUsuario.Field()
    eliminar_usuario          = EliminarUsuario.Field()
    cambiar_password          = CambiarPassword.Field()
    asignar_rol_a_usuario     = AsignarRolAUsuario.Field()
    asignar_permiso_a_usuario = AsignarPermisoAUsuario.Field()
    eliminar_permiso_usuario  = EliminarPermisoUsuario.Field()
    login_usuario             = LoginUsuario.Field()
    registrar_pasajero        = RegistrarPasajero.Field()
    login_pasajero            = LoginPasajero.Field()