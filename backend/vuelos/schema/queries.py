import graphene
from graphene_django import DjangoObjectType
from vuelos.models import (
    Aeropuerto, Aeronave, Asiento, Ruta, Escala,
    ProgramacionVuelo, Itinerario, AsientoVuelo,
    ConfiguracionPrecio, OfertaVuelo,
    Tripulante, GrupoTripulacion, AsignacionGrupo,
    Reprogramacion
)


class AeropuertoType(DjangoObjectType):
    class Meta:
        model  = Aeropuerto
        fields = ('id_aeropuerto', 'nombre', 'ciudad', 'codigo', 'tipo', 'estado', 'latitud', 'longitud')
        convert_choices_to_enum = False


class AeronaveType(DjangoObjectType):
    total_asientos = graphene.Int()

    class Meta:
        model  = Aeronave
        fields = (
            'id_aeronave', 'codigo_aeronave', 'modelo', 'tipo_pasillo',
            'asientos_economica', 'asientos_economica_premium',
            'asientos_ejecutiva', 'asientos_primera_clase', 'estado'
        )
        convert_choices_to_enum = False

    def resolve_total_asientos(self, info):
        return self.total_asientos()


class AsientoType(DjangoObjectType):
    class Meta:
        model  = Asiento
        fields = ('id_asiento', 'id_aeronave', 'numero', 'fila', 'clase', 'estado')
        convert_choices_to_enum = False


class RutaType(DjangoObjectType):
    class Meta:
        model  = Ruta
        fields = ('id_ruta', 'id_aeropuerto_origen', 'id_aeropuerto_destino', 'distancia_km', 'duracion_hr', 'tipo', 'estado')
        convert_choices_to_enum = False


class EscalaType(DjangoObjectType):
    class Meta:
        model  = Escala
        fields = ('id_escala', 'id_ruta', 'aeropuerto', 'ciudad', 'orden', 'tiempo_duracion')


class ProgramacionVueloType(DjangoObjectType):
    class Meta:
        model  = ProgramacionVuelo
        fields = (
            'id_programacion', 'codigo_vuelo', 'id_ruta', 'id_aeronave',
            'fecha_salida', 'hora_salida', 'fecha_llegada', 'hora_llegada',
            'asientos_disponible', 'asiento_vendido', 'precio_base',
            'ocupacion_minima', 'estado', 'motivo_cancelacion', 'descripcion_cancelacion'
        )
        convert_choices_to_enum = False


class ItinerarioType(DjangoObjectType):
    class Meta:
        model  = Itinerario
        fields = ('id_itinerario', 'id_programacion', 'fecha_salida', 'fecha_llegada', 'duracion_total', 'tipo', 'estado', 'observaciones')
        convert_choices_to_enum = False


class AsientoVueloType(DjangoObjectType):
    class Meta:
        model  = AsientoVuelo
        fields = ('id_asiento_vuelo', 'id_programacion', 'id_asiento', 'estado')
        convert_choices_to_enum = False


class ConfiguracionPrecioType(DjangoObjectType):
    class Meta:
        model  = ConfiguracionPrecio
        fields = ('id_config', 'incremento_economica_premium', 'incremento_ejecutiva', 'incremento_primera_clase', 'activo')


class OfertaVueloType(DjangoObjectType):
    class Meta:
        model  = OfertaVuelo
        fields = ('id_oferta', 'id_programacion', 'clase', 'porcentaje_descuento', 'fecha_inicio', 'fecha_fin', 'activo')
        convert_choices_to_enum = False


class ClaseResumenType(graphene.ObjectType):
    clase             = graphene.String()
    total             = graphene.Int()
    disponibles       = graphene.Int()
    precio_base       = graphene.Float()
    precio_con_oferta = graphene.Float()


class TripulanteType(DjangoObjectType):
    class Meta:
        model  = Tripulante
        fields = ('id_tripulante', 'nombre', 'apellido', 'ci', 'cargo', 'estado')
        convert_choices_to_enum = False


class GrupoTripulacionType(DjangoObjectType):
    total_tripulantes = graphene.Int()

    class Meta:
        model  = GrupoTripulacion
        fields = ('id_grupo', 'nombre', 'tripulantes', 'estado')
        convert_choices_to_enum = False

    def resolve_total_tripulantes(self, info):
        return self.tripulantes.count()


class AsignacionGrupoType(DjangoObjectType):
    class Meta:
        model  = AsignacionGrupo
        fields = ('id_asignacion', 'id_grupo', 'id_programacion', 'estado', 'fecha_asignacion')
        convert_choices_to_enum = False


class ReprogramacionType(DjangoObjectType):
    class Meta:
        model  = Reprogramacion
        fields = (
            'id_reprogramacion', 'id_programacion', 'motivo', 'descripcion',
            'estado', 'nueva_fecha_salida', 'nueva_hora_salida',
            'fecha_creacion', 'fecha_actualizacion'
        )
        convert_choices_to_enum = False


class Query(graphene.ObjectType):
    # Vuelos
    aeropuertos          = graphene.List(AeropuertoType)
    aeropuerto           = graphene.Field(AeropuertoType, id_aeropuerto=graphene.Int(required=True))
    aeronaves            = graphene.List(AeronaveType)
    aeronave             = graphene.Field(AeronaveType, id_aeronave=graphene.Int(required=True))
    asientos             = graphene.List(AsientoType, id_aeronave=graphene.Int())
    rutas                = graphene.List(RutaType)
    ruta                 = graphene.Field(RutaType, id_ruta=graphene.Int(required=True))
    escalas              = graphene.List(EscalaType, id_ruta=graphene.Int())
    programaciones       = graphene.List(ProgramacionVueloType)
    programacion         = graphene.Field(ProgramacionVueloType, id_programacion=graphene.Int(required=True))
    asientos_vuelo       = graphene.List(AsientoVueloType, id_programacion=graphene.Int(required=True))
    asientos_vuelo_clase = graphene.List(AsientoVueloType, id_programacion=graphene.Int(required=True), clase=graphene.String(required=True))
    clases_vuelo         = graphene.List(ClaseResumenType, id_programacion=graphene.Int(required=True))
    configuracion_precio = graphene.Field(ConfiguracionPrecioType)
    ofertas_vuelo        = graphene.List(OfertaVueloType, id_programacion=graphene.Int(required=True))
    # Tripulacion
    tripulantes          = graphene.List(TripulanteType)
    tripulante           = graphene.Field(TripulanteType, id_tripulante=graphene.Int(required=True))
    grupos_tripulacion   = graphene.List(GrupoTripulacionType)
    grupo_tripulacion    = graphene.Field(GrupoTripulacionType, id_grupo=graphene.Int(required=True))
    asignaciones_grupo   = graphene.List(AsignacionGrupoType)
    asignacion_por_vuelo = graphene.Field(AsignacionGrupoType, id_programacion=graphene.Int(required=True))
    # Reprogramacion
    reprogramaciones     = graphene.List(ReprogramacionType)
    reprogramacion       = graphene.Field(ReprogramacionType, id_reprogramacion=graphene.Int(required=True))

    def resolve_aeropuertos(root, info):
        return Aeropuerto.objects.filter(estado='activo')

    def resolve_aeropuerto(root, info, id_aeropuerto):
        try:
            return Aeropuerto.objects.get(pk=id_aeropuerto)
        except Aeropuerto.DoesNotExist:
            return None

    def resolve_aeronaves(root, info):
        return Aeronave.objects.filter(estado='activo')

    def resolve_aeronave(root, info, id_aeronave):
        try:
            return Aeronave.objects.get(pk=id_aeronave)
        except Aeronave.DoesNotExist:
            return None

    def resolve_asientos(root, info, id_aeronave=None):
        qs = Asiento.objects.select_related('id_aeronave').filter(estado='activo')
        if id_aeronave:
            qs = qs.filter(id_aeronave__id_aeronave=id_aeronave)
        return qs

    def resolve_rutas(root, info):
        return Ruta.objects.select_related('id_aeropuerto_origen', 'id_aeropuerto_destino').filter(estado='activo')

    def resolve_ruta(root, info, id_ruta):
        try:
            return Ruta.objects.get(pk=id_ruta)
        except Ruta.DoesNotExist:
            return None

    def resolve_escalas(root, info, id_ruta=None):
        qs = Escala.objects.select_related('id_ruta', 'aeropuerto')
        if id_ruta:
            qs = qs.filter(id_ruta__id_ruta=id_ruta)
        return qs

    def resolve_programaciones(root, info):
        return ProgramacionVuelo.objects.select_related(
            'id_ruta__id_aeropuerto_origen', 'id_ruta__id_aeropuerto_destino', 'id_aeronave'
        ).all()

    def resolve_programacion(root, info, id_programacion):
        try:
            return ProgramacionVuelo.objects.get(pk=id_programacion)
        except ProgramacionVuelo.DoesNotExist:
            return None

    def resolve_asientos_vuelo(root, info, id_programacion):
        return AsientoVuelo.objects.select_related('id_asiento').filter(
            id_programacion__id_programacion=id_programacion
        )

    def resolve_asientos_vuelo_clase(root, info, id_programacion, clase):
        return AsientoVuelo.objects.select_related('id_asiento').filter(
            id_programacion__id_programacion=id_programacion,
            id_asiento__clase=clase.lower(),
            estado='disponible'
        )

    def resolve_clases_vuelo(root, info, id_programacion):
        from decimal import Decimal
        try:
            prog    = ProgramacionVuelo.objects.get(pk=id_programacion)
            config  = ConfiguracionPrecio.get_activa()
            ofertas = {o.clase: o.porcentaje_descuento for o in OfertaVuelo.objects.filter(id_programacion=prog, activo=True)}
            incrementos = {
                'economica':         Decimal('0'),
                'economica_premium': config.incremento_economica_premium if config else Decimal('10'),
                'ejecutiva':         config.incremento_ejecutiva         if config else Decimal('15'),
                'primera_clase':     config.incremento_primera_clase     if config else Decimal('20'),
            }
            clases = []
            for clase, incremento in incrementos.items():
                total = AsientoVuelo.objects.filter(id_programacion=prog, id_asiento__clase=clase).count()
                if total == 0:
                    continue
                disponibles   = AsientoVuelo.objects.filter(id_programacion=prog, id_asiento__clase=clase, estado='disponible').count()
                precio        = float(prog.precio_base) * (1 + float(incremento) / 100)
                descuento     = ofertas.get(clase, Decimal('0'))
                precio_oferta = precio * (1 - float(descuento) / 100) if descuento else precio
                clases.append(ClaseResumenType(clase=clase, total=total, disponibles=disponibles, precio_base=round(precio, 2), precio_con_oferta=round(precio_oferta, 2)))
            return clases
        except ProgramacionVuelo.DoesNotExist:
            return []

    def resolve_configuracion_precio(root, info):
        return ConfiguracionPrecio.get_activa()

    def resolve_ofertas_vuelo(root, info, id_programacion):
        return OfertaVuelo.objects.filter(id_programacion__id_programacion=id_programacion)

    def resolve_tripulantes(root, info):
        return Tripulante.objects.all()

    def resolve_tripulante(root, info, id_tripulante):
        try:
            return Tripulante.objects.get(pk=id_tripulante)
        except Tripulante.DoesNotExist:
            return None

    def resolve_grupos_tripulacion(root, info):
        return GrupoTripulacion.objects.prefetch_related('tripulantes').all()

    def resolve_grupo_tripulacion(root, info, id_grupo):
        try:
            return GrupoTripulacion.objects.get(pk=id_grupo)
        except GrupoTripulacion.DoesNotExist:
            return None

    def resolve_asignaciones_grupo(root, info):
        return AsignacionGrupo.objects.select_related('id_grupo', 'id_programacion').all()

    def resolve_asignacion_por_vuelo(root, info, id_programacion):
        try:
            return AsignacionGrupo.objects.get(id_programacion__id_programacion=id_programacion)
        except AsignacionGrupo.DoesNotExist:
            return None

    def resolve_reprogramaciones(root, info):
        return Reprogramacion.objects.select_related('id_programacion').all()

    def resolve_reprogramacion(root, info, id_reprogramacion):
        try:
            return Reprogramacion.objects.get(pk=id_reprogramacion)
        except Reprogramacion.DoesNotExist:
            return None