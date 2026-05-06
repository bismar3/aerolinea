import math
from decimal import Decimal
import graphene
from django.utils import timezone
from vuelos.models import (
    Aeropuerto, Aeronave, Asiento, Ruta, Escala,
    ProgramacionVuelo, Itinerario, AsientoVuelo,
    ConfiguracionPrecio, OfertaVuelo,
    Tripulante, GrupoTripulacion, AsignacionGrupo,
    Reprogramacion
)
from .queries import (
    AeropuertoType, AeronaveType, AsientoType,
    RutaType, EscalaType, ProgramacionVueloType,
    ConfiguracionPrecioType, OfertaVueloType,
    TripulanteType, GrupoTripulacionType, AsignacionGrupoType,
    ReprogramacionType
)


def calcular_distancia_km(lat1, lon1, lat2, lon2):
    R     = 6371
    d_lat = math.radians(float(lat2) - float(lat1))
    d_lon = math.radians(float(lon2) - float(lon1))
    a     = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(float(lat1))) *
             math.cos(math.radians(float(lat2))) *
             math.sin(d_lon / 2) ** 2)
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def calcular_duracion_hr(distancia_km):
    return round(distancia_km / 850 + 0.5, 2)


def generar_asientos(aeronave):
    letras   = aeronave.letras_por_fila()
    por_fila = len(letras)
    asientos = []
    fila_actual = 1
    clases_config = [
        ('primera_clase',     aeronave.asientos_primera_clase),
        ('ejecutiva',         aeronave.asientos_ejecutiva),
        ('economica_premium', aeronave.asientos_economica_premium),
        ('economica',         aeronave.asientos_economica),
    ]
    for clase, cantidad in clases_config:
        if cantidad == 0:
            continue
        filas_necesarias = math.ceil(cantidad / por_fila)
        generados = 0
        for f in range(filas_necesarias):
            for letra in letras:
                if generados >= cantidad:
                    break
                asientos.append(Asiento(
                    id_aeronave=aeronave, numero=f"{fila_actual}{letra}",
                    fila=fila_actual, clase=clase, estado='activo'
                ))
                generados += 1
            fila_actual += 1
    Asiento.objects.bulk_create(asientos)
    return len(asientos)


def generar_codigo_vuelo(ruta, tiene_escalas=False):
    if ruta.tipo == 'internacional':
        prefijo = 'BOA-IE-' if tiene_escalas else 'BOA-I-'
    else:
        prefijo = 'BOA-NE-' if tiene_escalas else 'BOA-N-'
    ultimo = ProgramacionVuelo.objects.filter(codigo_vuelo__startswith=prefijo).order_by('-codigo_vuelo').first()
    if ultimo:
        try:
            num = int(ultimo.codigo_vuelo.split('-')[-1]) + 1
        except ValueError:
            num = 1
    else:
        num = 1
    return f"{prefijo}{str(num).zfill(3)}"


def _liberar_todos_al_reprogramar(prog):
    """
    Al reprogramar un vuelo:
    - TODOS los asientos se liberan → disponible
    - Todas las reservas se cancelan
    - Todos los tickets se anulan
    - Económica/Econ.Premium → sin devolución (dinero queda en la empresa)
    - Ejecutiva/Primera Clase → se crea Devolucion pendiente automáticamente
    """
    from reservas.models import Reserva
    from salida.models import Devolucion

    PORCENTAJE_REEMBOLSO = {
        'ejecutiva':     50,
        'primera_clase': 100,
    }
    ahora = timezone.now()

    reservas = Reserva.objects.filter(
        id_asiento_vuelo__id_programacion=prog,
        estado__in=['pendiente', 'confirmada']
    ).select_related(
        'id_asiento_vuelo__id_asiento',
        'id_cliente'
    )

    canceladas   = 0
    devoluciones = 0

    for reserva in reservas:
        clase = reserva.id_asiento_vuelo.id_asiento.clase

        # Liberar asiento
        reserva.id_asiento_vuelo.estado = 'disponible'
        reserva.id_asiento_vuelo.save()

        # Cancelar reserva
        reserva.estado            = 'cancelada'
        reserva.fecha_cancelacion = ahora
        reserva.save()

        # Anular ticket
        ticket = None
        try:
            ticket        = reserva.ticket
            ticket.estado = 'anulado'
            ticket.save()
        except Exception:
            pass

        # Devolución para ejecutiva y primera clase
        if ticket and clase in PORCENTAJE_REEMBOLSO:
            porcentaje      = PORCENTAJE_REEMBOLSO[clase]
            monto_reembolso = round(float(ticket.precio) * porcentaje / 100, 2)
            Devolucion.objects.get_or_create(
                id_ticket=ticket,
                defaults={
                    'motivo':                'meteorologia',  # reprogramación = causa BOA
                    'porcentaje_reembolso':  porcentaje,
                    'monto_original':        ticket.precio,
                    'monto_reembolso':       monto_reembolso,
                    'estado':                'pendiente',
                    'observaciones':         f"Reprogramación vuelo {prog.codigo_vuelo}",
                }
            )
            devoluciones += 1

        canceladas += 1

    # Resetear contador de vendidos
    prog.asiento_vendido = 0
    prog.save()

    return canceladas, devoluciones


# ── AEROPUERTO ────────────────────────────────────────────────────────────────
class CrearAeropuerto(graphene.Mutation):
    class Arguments:
        nombre   = graphene.String(required=True)
        ciudad   = graphene.String(required=True)
        codigo   = graphene.String(required=True)
        tipo     = graphene.String()
        latitud  = graphene.Float()
        longitud = graphene.Float()

    aeropuerto = graphene.Field(AeropuertoType)
    ok         = graphene.Boolean()
    mensaje    = graphene.String()

    def mutate(root, info, nombre, ciudad, codigo, tipo='nacional', latitud=None, longitud=None):
        if Aeropuerto.objects.filter(codigo=codigo.upper()).exists():
            return CrearAeropuerto(ok=False, mensaje=f"Ya existe un aeropuerto con codigo '{codigo}'")
        aeropuerto = Aeropuerto.objects.create(
            nombre=nombre, ciudad=ciudad, codigo=codigo.upper(), tipo=tipo,
            latitud=Decimal(str(latitud))   if latitud  is not None else None,
            longitud=Decimal(str(longitud)) if longitud is not None else None,
        )
        return CrearAeropuerto(aeropuerto=aeropuerto, ok=True, mensaje="Aeropuerto creado correctamente")


class ActualizarAeropuerto(graphene.Mutation):
    class Arguments:
        id_aeropuerto = graphene.Int(required=True)
        nombre        = graphene.String()
        ciudad        = graphene.String()
        codigo        = graphene.String()
        tipo          = graphene.String()
        estado        = graphene.String()
        latitud       = graphene.Float()
        longitud      = graphene.Float()

    aeropuerto = graphene.Field(AeropuertoType)
    ok         = graphene.Boolean()
    mensaje    = graphene.String()

    def mutate(root, info, id_aeropuerto, **kwargs):
        try:
            aeropuerto = Aeropuerto.objects.get(pk=id_aeropuerto)
            for key, value in kwargs.items():
                if value is not None:
                    if key in ('latitud', 'longitud'):
                        setattr(aeropuerto, key, Decimal(str(value)))
                    else:
                        setattr(aeropuerto, key, value)
            aeropuerto.save()
            return ActualizarAeropuerto(aeropuerto=aeropuerto, ok=True, mensaje="Aeropuerto actualizado correctamente")
        except Aeropuerto.DoesNotExist:
            return ActualizarAeropuerto(ok=False, mensaje="Aeropuerto no encontrado")


class EliminarAeropuerto(graphene.Mutation):
    class Arguments:
        id_aeropuerto = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_aeropuerto):
        try:
            Aeropuerto.objects.get(pk=id_aeropuerto).delete()
            return EliminarAeropuerto(ok=True, mensaje="Aeropuerto eliminado correctamente")
        except Aeropuerto.DoesNotExist:
            return EliminarAeropuerto(ok=False, mensaje="Aeropuerto no encontrado")


# ── AERONAVE ──────────────────────────────────────────────────────────────────
class CrearAeronave(graphene.Mutation):
    class Arguments:
        codigo_aeronave            = graphene.String(required=True)
        modelo                     = graphene.String(required=True)
        tipo_pasillo               = graphene.String(required=True)
        asientos_economica         = graphene.Int(required=True)
        asientos_economica_premium = graphene.Int()
        asientos_ejecutiva         = graphene.Int()
        asientos_primera_clase     = graphene.Int()

    aeronave       = graphene.Field(AeronaveType)
    ok             = graphene.Boolean()
    mensaje        = graphene.String()
    total_asientos = graphene.Int()

    def mutate(root, info, codigo_aeronave, modelo, tipo_pasillo,
               asientos_economica, asientos_economica_premium=0,
               asientos_ejecutiva=0, asientos_primera_clase=0):
        if Aeronave.objects.filter(codigo_aeronave=codigo_aeronave).exists():
            return CrearAeronave(ok=False, mensaje=f"Ya existe una aeronave con codigo '{codigo_aeronave}'")
        aeronave = Aeronave.objects.create(
            codigo_aeronave=codigo_aeronave, modelo=modelo, tipo_pasillo=tipo_pasillo,
            asientos_economica=asientos_economica,
            asientos_economica_premium=asientos_economica_premium,
            asientos_ejecutiva=asientos_ejecutiva,
            asientos_primera_clase=asientos_primera_clase,
        )
        total = generar_asientos(aeronave)
        return CrearAeronave(aeronave=aeronave, ok=True,
            mensaje=f"Aeronave creada con {total} asientos generados", total_asientos=total)


class ActualizarAeronave(graphene.Mutation):
    class Arguments:
        id_aeronave = graphene.Int(required=True)
        modelo      = graphene.String()
        estado      = graphene.String()

    aeronave = graphene.Field(AeronaveType)
    ok       = graphene.Boolean()
    mensaje  = graphene.String()

    def mutate(root, info, id_aeronave, **kwargs):
        try:
            aeronave = Aeronave.objects.get(pk=id_aeronave)
            for key, value in kwargs.items():
                if value is not None:
                    setattr(aeronave, key, value)
            aeronave.save()
            return ActualizarAeronave(aeronave=aeronave, ok=True, mensaje="Aeronave actualizada correctamente")
        except Aeronave.DoesNotExist:
            return ActualizarAeronave(ok=False, mensaje="Aeronave no encontrada")


class EliminarAeronave(graphene.Mutation):
    class Arguments:
        id_aeronave = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_aeronave):
        try:
            Aeronave.objects.get(pk=id_aeronave).delete()
            return EliminarAeronave(ok=True, mensaje="Aeronave eliminada correctamente")
        except Aeronave.DoesNotExist:
            return EliminarAeronave(ok=False, mensaje="Aeronave no encontrada")


# ── RUTA ──────────────────────────────────────────────────────────────────────
class CrearRuta(graphene.Mutation):
    class Arguments:
        id_aeropuerto_origen  = graphene.Int(required=True)
        id_aeropuerto_destino = graphene.Int(required=True)
        tipo                  = graphene.String()

    ruta         = graphene.Field(RutaType)
    ok           = graphene.Boolean()
    mensaje      = graphene.String()
    distancia_km = graphene.Float()
    duracion_hr  = graphene.Float()

    def mutate(root, info, id_aeropuerto_origen, id_aeropuerto_destino, tipo='nacional'):
        try:
            origen  = Aeropuerto.objects.get(pk=id_aeropuerto_origen)
            destino = Aeropuerto.objects.get(pk=id_aeropuerto_destino)
            if Ruta.objects.filter(id_aeropuerto_origen=origen, id_aeropuerto_destino=destino).exists():
                return CrearRuta(ok=False, mensaje="Esta ruta ya existe")
            distancia = None
            duracion  = None
            if origen.latitud and origen.longitud and destino.latitud and destino.longitud:
                distancia = calcular_distancia_km(origen.latitud, origen.longitud, destino.latitud, destino.longitud)
                duracion  = calcular_duracion_hr(distancia)
            ruta = Ruta.objects.create(
                id_aeropuerto_origen=origen, id_aeropuerto_destino=destino,
                distancia_km=Decimal(str(distancia)) if distancia is not None else None,
                duracion_hr=Decimal(str(duracion))   if duracion  is not None else None,
                tipo=tipo
            )
            return CrearRuta(ruta=ruta, ok=True, mensaje="Ruta creada correctamente",
                             distancia_km=float(distancia) if distancia else None,
                             duracion_hr=float(duracion)   if duracion  else None)
        except Aeropuerto.DoesNotExist:
            return CrearRuta(ok=False, mensaje="Aeropuerto no encontrado")


class EliminarRuta(graphene.Mutation):
    class Arguments:
        id_ruta = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_ruta):
        try:
            Ruta.objects.get(pk=id_ruta).delete()
            return EliminarRuta(ok=True, mensaje="Ruta eliminada correctamente")
        except Ruta.DoesNotExist:
            return EliminarRuta(ok=False, mensaje="Ruta no encontrada")


# ── ESCALA ────────────────────────────────────────────────────────────────────
class CrearEscala(graphene.Mutation):
    class Arguments:
        id_ruta         = graphene.Int(required=True)
        id_aeropuerto   = graphene.Int(required=True)
        ciudad          = graphene.String(required=True)
        orden           = graphene.Int(required=True)
        tiempo_duracion = graphene.Int()

    escala  = graphene.Field(EscalaType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_ruta, id_aeropuerto, ciudad, orden, tiempo_duracion=0):
        try:
            ruta       = Ruta.objects.get(pk=id_ruta)
            aeropuerto = Aeropuerto.objects.get(pk=id_aeropuerto)
            escala     = Escala.objects.create(
                id_ruta=ruta, aeropuerto=aeropuerto,
                ciudad=ciudad, orden=orden, tiempo_duracion=tiempo_duracion
            )
            return CrearEscala(escala=escala, ok=True, mensaje="Escala creada correctamente")
        except Ruta.DoesNotExist:
            return CrearEscala(ok=False, mensaje="Ruta no encontrada")
        except Aeropuerto.DoesNotExist:
            return CrearEscala(ok=False, mensaje="Aeropuerto no encontrado")


class EliminarEscala(graphene.Mutation):
    class Arguments:
        id_escala = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_escala):
        try:
            Escala.objects.get(pk=id_escala).delete()
            return EliminarEscala(ok=True, mensaje="Escala eliminada correctamente")
        except Escala.DoesNotExist:
            return EliminarEscala(ok=False, mensaje="Escala no encontrada")


# ── PROGRAMACION VUELO ────────────────────────────────────────────────────────
class CrearProgramacionVuelo(graphene.Mutation):
    class Arguments:
        id_ruta       = graphene.Int(required=True)
        id_aeronave   = graphene.Int(required=True)
        fecha_salida  = graphene.Date(required=True)
        hora_salida   = graphene.Time(required=True)
        fecha_llegada = graphene.Date(required=True)
        hora_llegada  = graphene.Time(required=True)
        precio_base   = graphene.Float(required=True)

    programacion = graphene.Field(ProgramacionVueloType)
    ok           = graphene.Boolean()
    mensaje      = graphene.String()
    codigo_vuelo = graphene.String()

    def mutate(root, info, id_ruta, id_aeronave, fecha_salida, hora_salida,
               fecha_llegada, hora_llegada, precio_base):
        try:
            ruta          = Ruta.objects.get(pk=id_ruta)
            aeronave      = Aeronave.objects.get(pk=id_aeronave)
            tiene_escalas = ruta.escalas.exists()
            codigo        = generar_codigo_vuelo(ruta, tiene_escalas=tiene_escalas)
            total_asientos = aeronave.total_asientos()
            prog = ProgramacionVuelo.objects.create(
                codigo_vuelo=codigo, id_ruta=ruta, id_aeronave=aeronave,
                fecha_salida=fecha_salida, hora_salida=hora_salida,
                fecha_llegada=fecha_llegada, hora_llegada=hora_llegada,
                asientos_disponible=total_asientos, precio_base=precio_base
            )
            asientos = Asiento.objects.filter(id_aeronave=aeronave, estado='activo')
            AsientoVuelo.objects.bulk_create([
                AsientoVuelo(id_programacion=prog, id_asiento=a, estado='disponible')
                for a in asientos
            ])
            return CrearProgramacionVuelo(
                programacion=prog, ok=True,
                mensaje=f"Vuelo {codigo} programado con {total_asientos} asientos",
                codigo_vuelo=codigo
            )
        except Ruta.DoesNotExist:
            return CrearProgramacionVuelo(ok=False, mensaje="Ruta no encontrada")
        except Aeronave.DoesNotExist:
            return CrearProgramacionVuelo(ok=False, mensaje="Aeronave no encontrada")


class ActualizarProgramacionVuelo(graphene.Mutation):
    class Arguments:
        id_programacion         = graphene.Int(required=True)
        estado                  = graphene.String()
        precio_base             = graphene.Float()
        hora_salida             = graphene.Time()
        hora_llegada            = graphene.Time()
        motivo_cancelacion      = graphene.String()
        descripcion_cancelacion = graphene.String()

    programacion = graphene.Field(ProgramacionVueloType)
    ok           = graphene.Boolean()
    mensaje      = graphene.String()

    def mutate(root, info, id_programacion, estado=None, precio_base=None,
               hora_salida=None, hora_llegada=None,
               motivo_cancelacion=None, descripcion_cancelacion=None):
        try:
            prog = ProgramacionVuelo.objects.get(pk=id_programacion)

            if precio_base is not None:
                prog.precio_base = Decimal(str(precio_base))
            if hora_salida is not None:
                prog.hora_salida = hora_salida
            if hora_llegada is not None:
                prog.hora_llegada = hora_llegada
            if descripcion_cancelacion is not None:
                prog.descripcion_cancelacion = descripcion_cancelacion

            if estado in ('cancelado', 'retrasado') and prog.estado != estado:
                if not motivo_cancelacion:
                    return ActualizarProgramacionVuelo(
                        ok=False, mensaje="Debe indicar el motivo de cancelación o retraso"
                    )
                prog.estado             = estado
                prog.motivo_cancelacion = motivo_cancelacion
                prog.save()
                Reprogramacion.objects.create(
                    id_programacion=prog,
                    motivo=motivo_cancelacion,
                    descripcion=descripcion_cancelacion or '',
                    estado='pendiente',
                )
                return ActualizarProgramacionVuelo(
                    programacion=prog, ok=True,
                    mensaje=f"Vuelo {prog.codigo_vuelo} marcado como {estado}."
                )

            if estado is not None:
                prog.estado = estado

            prog.save()
            return ActualizarProgramacionVuelo(
                programacion=prog, ok=True, mensaje="Vuelo actualizado correctamente"
            )
        except ProgramacionVuelo.DoesNotExist:
            return ActualizarProgramacionVuelo(ok=False, mensaje="Programacion no encontrada")


class EliminarProgramacionVuelo(graphene.Mutation):
    class Arguments:
        id_programacion = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_programacion):
        try:
            ProgramacionVuelo.objects.get(pk=id_programacion).delete()
            return EliminarProgramacionVuelo(ok=True, mensaje="Programacion eliminada correctamente")
        except ProgramacionVuelo.DoesNotExist:
            return EliminarProgramacionVuelo(ok=False, mensaje="Programacion no encontrada")


# ── CONFIGURACION PRECIO ──────────────────────────────────────────────────────
class CrearConfiguracionPrecio(graphene.Mutation):
    class Arguments:
        incremento_economica_premium = graphene.Float(required=True)
        incremento_ejecutiva         = graphene.Float(required=True)
        incremento_primera_clase     = graphene.Float(required=True)

    configuracion = graphene.Field(ConfiguracionPrecioType)
    ok            = graphene.Boolean()
    mensaje       = graphene.String()

    def mutate(root, info, incremento_economica_premium,
               incremento_ejecutiva, incremento_primera_clase):
        ConfiguracionPrecio.objects.filter(activo=True).update(activo=False)
        config = ConfiguracionPrecio.objects.create(
            incremento_economica_premium=incremento_economica_premium,
            incremento_ejecutiva=incremento_ejecutiva,
            incremento_primera_clase=incremento_primera_clase,
            activo=True
        )
        return CrearConfiguracionPrecio(
            configuracion=config, ok=True, mensaje="Configuracion guardada correctamente"
        )


class ActualizarConfiguracionPrecio(graphene.Mutation):
    class Arguments:
        id_config                    = graphene.Int(required=True)
        incremento_economica_premium = graphene.Float()
        incremento_ejecutiva         = graphene.Float()
        incremento_primera_clase     = graphene.Float()

    configuracion = graphene.Field(ConfiguracionPrecioType)
    ok            = graphene.Boolean()
    mensaje       = graphene.String()

    def mutate(root, info, id_config, **kwargs):
        try:
            config = ConfiguracionPrecio.objects.get(pk=id_config)
            for key, value in kwargs.items():
                if value is not None:
                    setattr(config, key, value)
            config.save()
            return ActualizarConfiguracionPrecio(
                configuracion=config, ok=True, mensaje="Configuracion actualizada correctamente"
            )
        except ConfiguracionPrecio.DoesNotExist:
            return ActualizarConfiguracionPrecio(ok=False, mensaje="Configuracion no encontrada")


# ── OFERTA VUELO ──────────────────────────────────────────────────────────────
class CrearOfertaVuelo(graphene.Mutation):
    class Arguments:
        id_programacion      = graphene.Int(required=True)
        clase                = graphene.String(required=True)
        porcentaje_descuento = graphene.Float(required=True)
        fecha_inicio         = graphene.Date(required=True)
        fecha_fin            = graphene.Date(required=True)

    oferta  = graphene.Field(OfertaVueloType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_programacion, clase, porcentaje_descuento, fecha_inicio, fecha_fin):
        try:
            prog   = ProgramacionVuelo.objects.get(pk=id_programacion)
            oferta = OfertaVuelo.objects.create(
                id_programacion=prog, clase=clase,
                porcentaje_descuento=porcentaje_descuento,
                fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
            )
            return CrearOfertaVuelo(oferta=oferta, ok=True, mensaje="Oferta creada correctamente")
        except ProgramacionVuelo.DoesNotExist:
            return CrearOfertaVuelo(ok=False, mensaje="Programacion no encontrada")


class EliminarOfertaVuelo(graphene.Mutation):
    class Arguments:
        id_oferta = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_oferta):
        try:
            OfertaVuelo.objects.get(pk=id_oferta).delete()
            return EliminarOfertaVuelo(ok=True, mensaje="Oferta eliminada correctamente")
        except OfertaVuelo.DoesNotExist:
            return EliminarOfertaVuelo(ok=False, mensaje="Oferta no encontrada")


# ── TRIPULANTE ────────────────────────────────────────────────────────────────
class CrearTripulante(graphene.Mutation):
    class Arguments:
        nombre   = graphene.String(required=True)
        apellido = graphene.String(required=True)
        ci       = graphene.String(required=True)
        cargo    = graphene.String(required=True)

    tripulante = graphene.Field(TripulanteType)
    ok         = graphene.Boolean()
    mensaje    = graphene.String()

    def mutate(root, info, nombre, apellido, ci, cargo):
        if Tripulante.objects.filter(ci=ci).exists():
            return CrearTripulante(ok=False, mensaje=f"Ya existe un tripulante con CI '{ci}'")
        t = Tripulante.objects.create(nombre=nombre, apellido=apellido, ci=ci, cargo=cargo)
        return CrearTripulante(tripulante=t, ok=True, mensaje="Tripulante creado correctamente")


class ActualizarTripulante(graphene.Mutation):
    class Arguments:
        id_tripulante = graphene.Int(required=True)
        nombre        = graphene.String()
        apellido      = graphene.String()
        ci            = graphene.String()
        cargo         = graphene.String()
        estado        = graphene.String()

    tripulante = graphene.Field(TripulanteType)
    ok         = graphene.Boolean()
    mensaje    = graphene.String()

    def mutate(root, info, id_tripulante, **kwargs):
        try:
            t = Tripulante.objects.get(pk=id_tripulante)
            for key, value in kwargs.items():
                if value is not None:
                    setattr(t, key, value)
            t.save()
            return ActualizarTripulante(tripulante=t, ok=True, mensaje="Tripulante actualizado correctamente")
        except Tripulante.DoesNotExist:
            return ActualizarTripulante(ok=False, mensaje="Tripulante no encontrado")


class EliminarTripulante(graphene.Mutation):
    class Arguments:
        id_tripulante = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_tripulante):
        try:
            Tripulante.objects.get(pk=id_tripulante).delete()
            return EliminarTripulante(ok=True, mensaje="Tripulante eliminado correctamente")
        except Tripulante.DoesNotExist:
            return EliminarTripulante(ok=False, mensaje="Tripulante no encontrado")


# ── GRUPO TRIPULACION ─────────────────────────────────────────────────────────
class CrearGrupo(graphene.Mutation):
    class Arguments:
        nombre = graphene.String(required=True)

    grupo   = graphene.Field(GrupoTripulacionType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, nombre):
        if GrupoTripulacion.objects.filter(nombre=nombre).exists():
            return CrearGrupo(ok=False, mensaje=f"Ya existe un grupo con nombre '{nombre}'")
        g = GrupoTripulacion.objects.create(nombre=nombre)
        return CrearGrupo(grupo=g, ok=True, mensaje="Grupo creado correctamente")


class AgregarTripulanteAGrupo(graphene.Mutation):
    class Arguments:
        id_grupo      = graphene.Int(required=True)
        id_tripulante = graphene.Int(required=True)

    grupo   = graphene.Field(GrupoTripulacionType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_grupo, id_tripulante):
        try:
            grupo      = GrupoTripulacion.objects.get(pk=id_grupo)
            tripulante = Tripulante.objects.get(pk=id_tripulante)
            if grupo.tripulantes.filter(pk=id_tripulante).exists():
                return AgregarTripulanteAGrupo(ok=False, mensaje="El tripulante ya está en este grupo")
            grupo.tripulantes.add(tripulante)
            return AgregarTripulanteAGrupo(grupo=grupo, ok=True, mensaje="Tripulante agregado al grupo correctamente")
        except GrupoTripulacion.DoesNotExist:
            return AgregarTripulanteAGrupo(ok=False, mensaje="Grupo no encontrado")
        except Tripulante.DoesNotExist:
            return AgregarTripulanteAGrupo(ok=False, mensaje="Tripulante no encontrado")


class QuitarTripulanteDeGrupo(graphene.Mutation):
    class Arguments:
        id_grupo      = graphene.Int(required=True)
        id_tripulante = graphene.Int(required=True)

    grupo   = graphene.Field(GrupoTripulacionType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_grupo, id_tripulante):
        try:
            grupo      = GrupoTripulacion.objects.get(pk=id_grupo)
            tripulante = Tripulante.objects.get(pk=id_tripulante)
            grupo.tripulantes.remove(tripulante)
            return QuitarTripulanteDeGrupo(grupo=grupo, ok=True, mensaje="Tripulante removido del grupo correctamente")
        except GrupoTripulacion.DoesNotExist:
            return QuitarTripulanteDeGrupo(ok=False, mensaje="Grupo no encontrado")
        except Tripulante.DoesNotExist:
            return QuitarTripulanteDeGrupo(ok=False, mensaje="Tripulante no encontrado")


class EliminarGrupo(graphene.Mutation):
    class Arguments:
        id_grupo = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_grupo):
        try:
            grupo = GrupoTripulacion.objects.get(pk=id_grupo)
            if grupo.asignaciones.filter(estado='activo').exists():
                return EliminarGrupo(ok=False, mensaje="No se puede eliminar un grupo con asignaciones activas")
            grupo.delete()
            return EliminarGrupo(ok=True, mensaje="Grupo eliminado correctamente")
        except GrupoTripulacion.DoesNotExist:
            return EliminarGrupo(ok=False, mensaje="Grupo no encontrado")


# ── ASIGNACION GRUPO ──────────────────────────────────────────────────────────
class AsignarGrupoAVuelo(graphene.Mutation):
    class Arguments:
        id_grupo        = graphene.Int(required=True)
        id_programacion = graphene.Int(required=True)

    asignacion = graphene.Field(AsignacionGrupoType)
    ok         = graphene.Boolean()
    mensaje    = graphene.String()

    def mutate(root, info, id_grupo, id_programacion):
        try:
            grupo = GrupoTripulacion.objects.get(pk=id_grupo)
            prog  = ProgramacionVuelo.objects.get(pk=id_programacion)
            if AsignacionGrupo.objects.filter(id_programacion=prog, estado='activo').exists():
                return AsignarGrupoAVuelo(ok=False, mensaje="Este vuelo ya tiene un grupo asignado")
            if grupo.estado != 'disponible':
                return AsignarGrupoAVuelo(ok=False, mensaje=f"El grupo no está disponible (estado: {grupo.estado})")
            asignacion = AsignacionGrupo.objects.create(id_grupo=grupo, id_programacion=prog)
            grupo.estado = 'asignado'
            grupo.save()
            grupo.tripulantes.filter(estado='libre').update(estado='asignado')
            return AsignarGrupoAVuelo(asignacion=asignacion, ok=True, mensaje="Grupo asignado al vuelo correctamente")
        except GrupoTripulacion.DoesNotExist:
            return AsignarGrupoAVuelo(ok=False, mensaje="Grupo no encontrado")
        except ProgramacionVuelo.DoesNotExist:
            return AsignarGrupoAVuelo(ok=False, mensaje="Vuelo no encontrado")


class LiberarGrupoDeVuelo(graphene.Mutation):
    class Arguments:
        id_asignacion = graphene.Int(required=True)

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_asignacion):
        try:
            asignacion        = AsignacionGrupo.objects.get(pk=id_asignacion)
            grupo             = asignacion.id_grupo
            asignacion.estado = 'completado'
            asignacion.save()
            grupo.estado = 'disponible'
            grupo.save()
            grupo.tripulantes.filter(estado__in=['asignado', 'en_vuelo']).update(estado='libre')
            return LiberarGrupoDeVuelo(ok=True, mensaje="Grupo liberado correctamente")
        except AsignacionGrupo.DoesNotExist:
            return LiberarGrupoDeVuelo(ok=False, mensaje="Asignación no encontrada")


# ── REPROGRAMACION ────────────────────────────────────────────────────────────
class ActualizarReprogramacion(graphene.Mutation):
    class Arguments:
        id_reprogramacion  = graphene.Int(required=True)
        estado             = graphene.String()
        nueva_fecha_salida = graphene.Date()
        nueva_hora_salida  = graphene.Time()
        descripcion        = graphene.String()

    reprogramacion      = graphene.Field(ReprogramacionType)
    ok                  = graphene.Boolean()
    mensaje             = graphene.String()
    reservas_canceladas = graphene.Int()
    devoluciones_creadas = graphene.Int()

    def mutate(root, info, id_reprogramacion, estado=None, nueva_fecha_salida=None,
               nueva_hora_salida=None, descripcion=None):
        try:
            rep  = Reprogramacion.objects.get(pk=id_reprogramacion)
            prog = rep.id_programacion
            reservas_canceladas  = 0
            devoluciones_creadas = 0
            ya_liberado          = False

            if descripcion is not None:
                rep.descripcion = descripcion

            # Cambio de fecha
            if nueva_fecha_salida is not None:
                rep.nueva_fecha_salida = nueva_fecha_salida
                prog.fecha_salida      = nueva_fecha_salida
                prog.estado            = 'reprogramado'
                prog.save()
                if not ya_liberado:
                    c, d = _liberar_todos_al_reprogramar(prog)
                    reservas_canceladas  += c
                    devoluciones_creadas += d
                    ya_liberado = True

            # Cambio de hora
            if nueva_hora_salida is not None:
                rep.nueva_hora_salida = nueva_hora_salida
                prog.hora_salida      = nueva_hora_salida
                prog.estado           = 'reprogramado'
                prog.save()
                if not ya_liberado:
                    c, d = _liberar_todos_al_reprogramar(prog)
                    reservas_canceladas  += c
                    devoluciones_creadas += d
                    ya_liberado = True

            if estado is not None:
                rep.estado = estado
                if estado == 'reprogramado':
                    prog.estado = 'reprogramado'
                    prog.save()
                    if not ya_liberado:
                        c, d = _liberar_todos_al_reprogramar(prog)
                        reservas_canceladas  += c
                        devoluciones_creadas += d
                elif estado == 'cancelado_definitivo':
                    prog.estado = 'cancelado'
                    prog.save()

            rep.save()

            msg = "Reprogramación actualizada correctamente"
            if reservas_canceladas > 0:
                msg += f" — {reservas_canceladas} reservas canceladas"
            if devoluciones_creadas > 0:
                msg += f", {devoluciones_creadas} devoluciones generadas (ejecutiva/primera clase)"

            return ActualizarReprogramacion(
                reprogramacion=rep, ok=True,
                mensaje=msg,
                reservas_canceladas=reservas_canceladas,
                devoluciones_creadas=devoluciones_creadas,
            )
        except Reprogramacion.DoesNotExist:
            return ActualizarReprogramacion(ok=False, mensaje="Reprogramación no encontrada")


# ── MUTATION CLASS ────────────────────────────────────────────────────────────
class Mutation(graphene.ObjectType):
    crear_aeropuerto                = CrearAeropuerto.Field()
    actualizar_aeropuerto           = ActualizarAeropuerto.Field()
    eliminar_aeropuerto             = EliminarAeropuerto.Field()
    crear_aeronave                  = CrearAeronave.Field()
    actualizar_aeronave             = ActualizarAeronave.Field()
    eliminar_aeronave               = EliminarAeronave.Field()
    crear_ruta                      = CrearRuta.Field()
    eliminar_ruta                   = EliminarRuta.Field()
    crear_escala                    = CrearEscala.Field()
    eliminar_escala                 = EliminarEscala.Field()
    crear_programacion_vuelo        = CrearProgramacionVuelo.Field()
    actualizar_programacion_vuelo   = ActualizarProgramacionVuelo.Field()
    eliminar_programacion_vuelo     = EliminarProgramacionVuelo.Field()
    crear_configuracion_precio      = CrearConfiguracionPrecio.Field()
    actualizar_configuracion_precio = ActualizarConfiguracionPrecio.Field()
    crear_oferta_vuelo              = CrearOfertaVuelo.Field()
    eliminar_oferta_vuelo           = EliminarOfertaVuelo.Field()
    crear_tripulante                = CrearTripulante.Field()
    actualizar_tripulante           = ActualizarTripulante.Field()
    eliminar_tripulante             = EliminarTripulante.Field()
    crear_grupo                     = CrearGrupo.Field()
    agregar_tripulante_grupo        = AgregarTripulanteAGrupo.Field()
    quitar_tripulante_grupo         = QuitarTripulanteDeGrupo.Field()
    eliminar_grupo                  = EliminarGrupo.Field()
    asignar_grupo_vuelo             = AsignarGrupoAVuelo.Field()
    liberar_grupo_vuelo             = LiberarGrupoDeVuelo.Field()
    actualizar_reprogramacion       = ActualizarReprogramacion.Field()