import graphene
from graphene_django import DjangoObjectType
from seguridad.models import Rol, Permiso, RolPermiso, Usuario, RolPermisoUsuario, Pasajero

class RolType(DjangoObjectType):
    class Meta:
        model = Rol
        fields = '__all__'

class PermisoType(DjangoObjectType):
    class Meta:
        model = Permiso
        fields = '__all__'

class RolPermisoType(DjangoObjectType):
    class Meta:
        model = RolPermiso
        fields = '__all__'

class UsuarioType(DjangoObjectType):
    class Meta:
        model = Usuario
        exclude = ('contrasena',)

class RolPermisoUsuarioType(DjangoObjectType):
    class Meta:
        model = RolPermisoUsuario
        fields = '__all__'

class PasajeroType(DjangoObjectType):
    class Meta:
        model = Pasajero
        fields = '__all__'

class Query(graphene.ObjectType):
    all_roles = graphene.List(RolType)
    all_permisos = graphene.List(PermisoType)
    all_rol_permisos = graphene.List(RolPermisoType)
    all_usuarios = graphene.List(UsuarioType)
    all_rol_permiso_usuarios = graphene.List(RolPermisoUsuarioType)
    all_pasajeros = graphene.List(PasajeroType)
    rol = graphene.Field(RolType, id=graphene.Int())
    permiso = graphene.Field(PermisoType, id=graphene.Int())
    usuario = graphene.Field(UsuarioType, id=graphene.Int())
    pasajero = graphene.Field(PasajeroType, id=graphene.Int())
    pasajero_por_usuario = graphene.Field(PasajeroType, id_usuario=graphene.Int())

    def resolve_all_roles(self, info):
        return Rol.objects.all()

    def resolve_all_permisos(self, info):
        return Permiso.objects.all()

    def resolve_all_rol_permisos(self, info):
        return RolPermiso.objects.all()

    def resolve_all_usuarios(self, info):
        return Usuario.objects.all()

    def resolve_all_rol_permiso_usuarios(self, info):
        return RolPermisoUsuario.objects.all()

    def resolve_all_pasajeros(self, info):
        return Pasajero.objects.all()

    def resolve_rol(self, info, id):
        return Rol.objects.get(pk=id)

    def resolve_permiso(self, info, id):
        return Permiso.objects.get(pk=id)

    def resolve_usuario(self, info, id):
        return Usuario.objects.get(pk=id)

    def resolve_pasajero(self, info, id):
        return Pasajero.objects.get(pk=id)

    def resolve_pasajero_por_usuario(self, info, id_usuario):
        return Pasajero.objects.get(usuario__id=id_usuario)