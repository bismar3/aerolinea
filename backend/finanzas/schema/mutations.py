import graphene
from finanzas.models import Ingreso, Egreso
from .queries import IngresoType, EgresoType


class CrearEgresoManual(graphene.Mutation):
    class Arguments:
        concepto      = graphene.String(required=True)
        monto         = graphene.Float(required=True)
        tipo          = graphene.String()
        observaciones = graphene.String()

    egreso  = graphene.Field(EgresoType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, concepto, monto, tipo='operacional', observaciones=None):
        egreso = Egreso.objects.create(
            concepto=concepto,
            monto=monto,
            tipo=tipo,
            observaciones=observaciones
        )
        return CrearEgresoManual(egreso=egreso, ok=True, mensaje="Egreso registrado correctamente")


class Mutation(graphene.ObjectType):
    crear_egreso_manual = CrearEgresoManual.Field()