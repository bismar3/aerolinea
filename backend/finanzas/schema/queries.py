import graphene
from graphene_django import DjangoObjectType
from finanzas.models import Ingreso, Egreso


class IngresoType(DjangoObjectType):
    class Meta:
        model  = Ingreso
        fields = ('id_ingreso', 'id_ticket', 'concepto', 'tipo', 'monto', 'fecha', 'observaciones')
        convert_choices_to_enum = False


class EgresoType(DjangoObjectType):
    class Meta:
        model  = Egreso
        fields = ('id_egreso', 'id_devolucion', 'concepto', 'tipo', 'monto', 'fecha', 'observaciones')
        convert_choices_to_enum = False


class ResumenFinancieroType(graphene.ObjectType):
    total_ingresos   = graphene.Float()
    total_egresos    = graphene.Float()
    balance          = graphene.Float()
    total_ventas     = graphene.Int()
    total_devoluciones = graphene.Int()


class Query(graphene.ObjectType):
    ingresos           = graphene.List(IngresoType)
    ingreso            = graphene.Field(IngresoType, id_ingreso=graphene.Int(required=True))
    egresos            = graphene.List(EgresoType)
    egreso             = graphene.Field(EgresoType, id_egreso=graphene.Int(required=True))
    resumen_financiero = graphene.Field(ResumenFinancieroType)
    ingresos_por_fecha = graphene.List(IngresoType, fecha_inicio=graphene.Date(required=True), fecha_fin=graphene.Date(required=True))
    egresos_por_fecha  = graphene.List(EgresoType,  fecha_inicio=graphene.Date(required=True), fecha_fin=graphene.Date(required=True))

    def resolve_ingresos(root, info):
        return Ingreso.objects.all()

    def resolve_ingreso(root, info, id_ingreso):
        try:
            return Ingreso.objects.get(pk=id_ingreso)
        except Ingreso.DoesNotExist:
            return None

    def resolve_egresos(root, info):
        return Egreso.objects.all()

    def resolve_egreso(root, info, id_egreso):
        try:
            return Egreso.objects.get(pk=id_egreso)
        except Egreso.DoesNotExist:
            return None

    def resolve_resumen_financiero(root, info):
        from django.db.models import Sum
        total_ingresos    = Ingreso.objects.aggregate(t=Sum('monto'))['t'] or 0
        total_egresos     = Egreso.objects.aggregate(t=Sum('monto'))['t'] or 0
        total_ventas      = Ingreso.objects.filter(tipo='venta_pasaje').count()
        total_devoluciones = Egreso.objects.filter(tipo='devolucion').count()
        return ResumenFinancieroType(
            total_ingresos=float(total_ingresos),
            total_egresos=float(total_egresos),
            balance=float(total_ingresos - total_egresos),
            total_ventas=total_ventas,
            total_devoluciones=total_devoluciones
        )

    def resolve_ingresos_por_fecha(root, info, fecha_inicio, fecha_fin):
        return Ingreso.objects.filter(fecha__date__range=[fecha_inicio, fecha_fin])

    def resolve_egresos_por_fecha(root, info, fecha_inicio, fecha_fin):
        return Egreso.objects.filter(fecha__date__range=[fecha_inicio, fecha_fin])