import graphene
from graphene_django import DjangoObjectType
from notificaciones.models import Notificacion


class NotificacionType(DjangoObjectType):
    class Meta:
        model  = Notificacion
        fields = (
            'id_notificacion', 'titulo', 'mensaje', 'tipo',
            'id_usuario', 'id_cliente', 'leida',
            'fecha_creacion', 'fecha_lectura',
            'referencia_id', 'referencia_tipo'
        )
        convert_choices_to_enum = False


class Query(graphene.ObjectType):
    notificaciones          = graphene.List(NotificacionType, id_usuario=graphene.Int(), id_cliente=graphene.Int())
    notificaciones_no_leidas = graphene.List(NotificacionType, id_usuario=graphene.Int(), id_cliente=graphene.Int())
    notificacion            = graphene.Field(NotificacionType, id_notificacion=graphene.Int(required=True))

    def resolve_notificaciones(root, info, id_usuario=None, id_cliente=None):
        qs = Notificacion.objects.all()
        if id_usuario:
            qs = qs.filter(id_usuario=id_usuario)
        if id_cliente:
            qs = qs.filter(id_cliente=id_cliente)
        return qs

    def resolve_notificaciones_no_leidas(root, info, id_usuario=None, id_cliente=None):
        qs = Notificacion.objects.filter(leida=False)
        if id_usuario:
            qs = qs.filter(id_usuario=id_usuario)
        if id_cliente:
            qs = qs.filter(id_cliente=id_cliente)
        return qs

    def resolve_notificacion(root, info, id_notificacion):
        try:
            return Notificacion.objects.get(pk=id_notificacion)
        except Notificacion.DoesNotExist:
            return None