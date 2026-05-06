import graphene
from django.utils import timezone
from notificaciones.models import Notificacion
from .queries import NotificacionType


def crear_notificacion(titulo, mensaje, tipo, id_usuario=None, id_cliente=None,
                       referencia_id=None, referencia_tipo=None):
    """
    Función utilitaria para crear notificaciones desde cualquier módulo.
    Uso: from notificaciones.schema.mutations import crear_notificacion
    """
    return Notificacion.objects.create(
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        id_usuario=id_usuario,
        id_cliente=id_cliente,
        referencia_id=referencia_id,
        referencia_tipo=referencia_tipo,
    )


class MarcarNotificacionLeida(graphene.Mutation):
    class Arguments:
        id_notificacion = graphene.Int(required=True)

    ok             = graphene.Boolean()
    mensaje        = graphene.String()
    notificacion   = graphene.Field(NotificacionType)

    def mutate(root, info, id_notificacion):
        try:
            notif = Notificacion.objects.get(pk=id_notificacion)
            notif.leida         = True
            notif.fecha_lectura = timezone.now()
            notif.save()
            return MarcarNotificacionLeida(ok=True, mensaje="Notificación marcada como leída", notificacion=notif)
        except Notificacion.DoesNotExist:
            return MarcarNotificacionLeida(ok=False, mensaje="Notificación no encontrada")


class MarcarTodasLeidas(graphene.Mutation):
    class Arguments:
        id_usuario = graphene.Int()
        id_cliente = graphene.Int()

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_usuario=None, id_cliente=None):
        qs = Notificacion.objects.filter(leida=False)
        if id_usuario:
            qs = qs.filter(id_usuario=id_usuario)
        if id_cliente:
            qs = qs.filter(id_cliente=id_cliente)
        count = qs.update(leida=True, fecha_lectura=timezone.now())
        return MarcarTodasLeidas(ok=True, mensaje=f"{count} notificaciones marcadas como leídas")


class Mutation(graphene.ObjectType):
    marcar_notificacion_leida = MarcarNotificacionLeida.Field()
    marcar_todas_leidas       = MarcarTodasLeidas.Field()