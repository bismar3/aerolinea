import graphene
from graphene_django import DjangoObjectType
from salida.models import Salida, DetalleAbordaje, Devolucion
from django.utils import timezone


class SalidaType(DjangoObjectType):
    porcentaje_ocupacion = graphene.Float()
    cumple_minimo        = graphene.Boolean()
    total_abordados      = graphene.Int()
    total_pasajeros      = graphene.Int()

    class Meta:
        model  = Salida
        fields = (
            'id_salida', 'id_programacion', 'estado',
            'fecha_salida_real', 'hora_salida_real',
            'motivo_cancelacion', 'observaciones', 'fecha_creacion'
        )
        convert_choices_to_enum = False

    def resolve_porcentaje_ocupacion(self, info):
        return self.porcentaje_ocupacion()

    def resolve_cumple_minimo(self, info):
        return self.cumple_minimo()

    def resolve_total_abordados(self, info):
        return self.detalles_abordaje.filter(abordado=True).count()

    def resolve_total_pasajeros(self, info):
        return self.detalles_abordaje.count()


class DetalleAbordajeType(DjangoObjectType):
    class Meta:
        model  = DetalleAbordaje
        fields = ('id_detalle', 'id_salida', 'id_reserva', 'abordado', 'hora_abordaje')


class DevolucionType(DjangoObjectType):
    class Meta:
        model  = Devolucion
        fields = (
            'id_devolucion', 'id_ticket', 'motivo',
            'porcentaje_reembolso', 'monto_original', 'monto_reembolso',
            'estado', 'observaciones', 'fecha_solicitud', 'fecha_procesado'
        )
        convert_choices_to_enum = False


class Query(graphene.ObjectType):
    salidas              = graphene.List(SalidaType)
    salida               = graphene.Field(SalidaType, id_salida=graphene.Int(required=True))
    salidas_hoy          = graphene.List(SalidaType)
    salida_por_vuelo     = graphene.Field(SalidaType, id_programacion=graphene.Int(required=True))
    detalles_abordaje    = graphene.List(DetalleAbordajeType, id_salida=graphene.Int(required=True))
    devoluciones         = graphene.List(DevolucionType)
    devolucion           = graphene.Field(DevolucionType, id_devolucion=graphene.Int(required=True))
    devoluciones_pendientes = graphene.List(DevolucionType)

    def resolve_salidas(root, info):
        return Salida.objects.select_related('id_programacion').all()

    def resolve_salida(root, info, id_salida):
        try:
            return Salida.objects.get(pk=id_salida)
        except Salida.DoesNotExist:
            return None

    def resolve_salidas_hoy(root, info):
        hoy = timezone.now().date()
        return Salida.objects.select_related(
            'id_programacion__id_ruta__id_aeropuerto_origen',
            'id_programacion__id_ruta__id_aeropuerto_destino',
        ).filter(id_programacion__fecha_salida=hoy)

    def resolve_salida_por_vuelo(root, info, id_programacion):
        try:
            return Salida.objects.get(id_programacion__id_programacion=id_programacion)
        except Salida.DoesNotExist:
            return None

    def resolve_detalles_abordaje(root, info, id_salida):
        return DetalleAbordaje.objects.select_related(
            'id_reserva__id_cliente',
            'id_reserva__id_asiento_vuelo__id_asiento',
        ).filter(id_salida__id_salida=id_salida)

    def resolve_devoluciones(root, info):
        return Devolucion.objects.select_related('id_ticket__id_reserva__id_cliente').all()

    def resolve_devolucion(root, info, id_devolucion):
        try:
            return Devolucion.objects.get(pk=id_devolucion)
        except Devolucion.DoesNotExist:
            return None

    def resolve_devoluciones_pendientes(root, info):
        return Devolucion.objects.filter(estado='pendiente').select_related(
            'id_ticket__id_reserva__id_cliente'
        )