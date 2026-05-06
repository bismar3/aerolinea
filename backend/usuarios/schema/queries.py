import graphene
from graphene_django import DjangoObjectType
from usuarios.models import Rol, Permiso, Usuario, PoliticaContrasena, RolPermisoUsuario, Pasajero


class RolType(DjangoObjectType):
    class Meta:
        model  = Rol
        fields = ('id_rol', 'nombre', 'descripcion', 'estado')


class PermisoType(DjangoObjectType):
    class Meta:
        model  = Permiso
        fields = ('id_permiso', 'nombre', 'descripcion', 'estado')


class PoliticaContrasenaType(DjangoObjectType):
    class Meta:
        model  = PoliticaContrasena
        fields = (
            'id_politica', 'longitud_minima', 'requiere_mayuscula',
            'requiere_numero', 'requiere_especial', 'max_intentos',
            'minutos_bloqueo', 'activo'
        )


class UsuarioType(DjangoObjectType):
    nombre_completo = graphene.String()
    permisos        = graphene.List(graphene.String)

    class Meta:
        model  = Usuario
        fields = (
            'id_usuario', 'nombre', 'paterno', 'materno',
            'telefono', 'correo', 'username',
            'fecha_registro', 'estado', 'tipo_usuario',
            'bloqueado', 'intentos_fallidos', 'id_rol'
        )

    def resolve_nombre_completo(self, info):
        return self.get_nombre_completo()

    def resolve_permisos(self, info):
        return list(
            self.permisos_usuario
            .select_related('id_permiso')
            .values_list('id_permiso__nombre', flat=True)
        )


class RolPermisoUsuarioType(DjangoObjectType):
    class Meta:
        model  = RolPermisoUsuario
        fields = ('id_rol_permiso_usuario', 'id_usuario', 'id_permiso')


class PasajeroType(DjangoObjectType):
    nombre_completo = graphene.String()

    class Meta:
        model  = Pasajero
        fields = (
            'id_pasajero', 'nombre', 'apellido_paterno', 'apellido_materno',
            'correo', 'num_telefono', 'nacionalidad',
            'tipo_documento', 'nro_documento', 'fecha_nacimiento', 'id_usuario'
        )

    def resolve_nombre_completo(self, info):
        return self.get_nombre_completo()


class Query(graphene.ObjectType):
    roles                  = graphene.List(RolType)
    rol                    = graphene.Field(RolType, id_rol=graphene.Int(required=True))
    permisos               = graphene.List(PermisoType)
    permiso                = graphene.Field(PermisoType, id_permiso=graphene.Int(required=True))
    usuarios               = graphene.List(UsuarioType)
    usuario                = graphene.Field(UsuarioType, id_usuario=graphene.Int(required=True))
    todos_permisos_usuario = graphene.List(RolPermisoUsuarioType)
    permisos_de_usuario    = graphene.List(RolPermisoUsuarioType, id_usuario=graphene.Int(required=True))
    politica_contrasena    = graphene.Field(PoliticaContrasenaType)
    pasajeros              = graphene.List(PasajeroType)
    pasajero               = graphene.Field(PasajeroType, id_pasajero=graphene.Int(required=True))
    pasajero_por_usuario   = graphene.Field(PasajeroType, id_usuario=graphene.Int(required=True))

    def resolve_roles(root, info):
        return Rol.objects.filter(estado='activo')

    def resolve_rol(root, info, id_rol):
        try:
            return Rol.objects.get(pk=id_rol)
        except Rol.DoesNotExist:
            return None

    def resolve_permisos(root, info):
        return Permiso.objects.filter(estado='activo')

    def resolve_permiso(root, info, id_permiso):
        try:
            return Permiso.objects.get(pk=id_permiso)
        except Permiso.DoesNotExist:
            return None

    def resolve_usuarios(root, info):
        return Usuario.objects.select_related('id_rol').filter(tipo_usuario='trabajador')

    def resolve_usuario(root, info, id_usuario):
        try:
            return Usuario.objects.get(pk=id_usuario)
        except Usuario.DoesNotExist:
            return None

    def resolve_todos_permisos_usuario(root, info):
        return RolPermisoUsuario.objects.select_related('id_usuario', 'id_permiso').all()

    def resolve_permisos_de_usuario(root, info, id_usuario):
        return RolPermisoUsuario.objects.select_related(
            'id_usuario', 'id_permiso'
        ).filter(id_usuario__id_usuario=id_usuario)

    def resolve_politica_contrasena(root, info):
        return PoliticaContrasena.objects.filter(activo=True).first()

    def resolve_pasajeros(root, info):
        return Pasajero.objects.all()

    def resolve_pasajero(root, info, id_pasajero):
        try:
            return Pasajero.objects.get(pk=id_pasajero)
        except Pasajero.DoesNotExist:
            return None

    def resolve_pasajero_por_usuario(root, info, id_usuario):
        try:
            return Pasajero.objects.get(id_usuario__id_usuario=id_usuario)
        except Pasajero.DoesNotExist:
            return None