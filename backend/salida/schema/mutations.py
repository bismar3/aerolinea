import graphene
from django.utils import timezone
from salida.models import Salida, DetalleAbordaje, Devolucion
from reservas.models import Reserva, Ticket
from vuelos.models import ProgramacionVuelo, AsientoVuelo
from notificaciones.schema.mutations import crear_notificacion
from .queries import SalidaType, DetalleAbordajeType, DevolucionType


# ── SALIDA ────────────────────────────────────────────────────────────────────
class AbrirSalida(graphene.Mutation):
    """Abre el proceso de salida — el vuelo está listo para abordar"""
    class Arguments:
        id_programacion = graphene.Int(required=True)

    salida  = graphene.Field(SalidaType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_programacion):
        try:
            prog = ProgramacionVuelo.objects.get(pk=id_programacion)

            if Salida.objects.filter(id_programacion=prog).exists():
                salida = Salida.objects.get(id_programacion=prog)
                return AbrirSalida(salida=salida, ok=True, mensaje="Salida ya existe")

            salida = Salida.objects.create(
                id_programacion=prog,
                estado='abordando'
            )

            # Crear detalle de abordaje para cada reserva confirmada
            reservas = Reserva.objects.filter(
                id_asiento_vuelo__id_programacion=prog,
                estado='confirmada'
            )
            detalles = [
                DetalleAbordaje(id_salida=salida, id_reserva=r, abordado=False)
                for r in reservas
            ]
            DetalleAbordaje.objects.bulk_create(detalles)

            return AbrirSalida(
                salida=salida, ok=True,
                mensaje=f"Salida abierta con {len(detalles)} pasajeros confirmados"
            )
        except ProgramacionVuelo.DoesNotExist:
            return AbrirSalida(ok=False, mensaje="Vuelo no encontrado")


class MarcarAbordaje(graphene.Mutation):
    class Arguments:
        id_detalle = graphene.Int(required=True)
        abordado   = graphene.Boolean(required=True)

    detalle = graphene.Field(DetalleAbordajeType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_detalle, abordado):
        try:
            detalle          = DetalleAbordaje.objects.get(pk=id_detalle)
            detalle.abordado = abordado
            if abordado:
                detalle.hora_abordaje = timezone.now().time()
            detalle.save()
            estado = "abordó" if abordado else "no se presentó"
            return MarcarAbordaje(detalle=detalle, ok=True, mensaje=f"Pasajero marcado como {estado}")
        except DetalleAbordaje.DoesNotExist:
            return MarcarAbordaje(ok=False, mensaje="Detalle no encontrado")


class CerrarSalida(graphene.Mutation):
    """Cierra la salida — el vuelo DESPEGA. Esto es la salida registrada."""
    class Arguments:
        id_salida = graphene.Int(required=True)

    salida  = graphene.Field(SalidaType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_salida):
        try:
            salida = Salida.objects.get(pk=id_salida)
            ahora  = timezone.now()

            salida.estado            = 'cerrada'
            salida.fecha_salida_real = ahora.date()
            salida.hora_salida_real  = ahora.time()
            salida.save()

            # Marcar vuelo como en_vuelo
            prog        = salida.id_programacion
            prog.estado = 'en_vuelo'
            prog.save()

            # Cancelar reservas pendientes que no pagaron a tiempo
            reservas_pendientes = Reserva.objects.filter(
                id_asiento_vuelo__id_programacion=prog,
                estado='pendiente'
            )
            for reserva in reservas_pendientes:
                reserva.id_asiento_vuelo.estado = 'disponible'
                reserva.id_asiento_vuelo.save()
                reserva.estado            = 'cancelada'
                reserva.fecha_cancelacion = ahora
                reserva.save()
                try:
                    ticket        = reserva.ticket
                    ticket.estado = 'anulado'
                    ticket.save()
                except Exception:
                    pass

            return CerrarSalida(salida=salida, ok=True, mensaje="✈ Vuelo en ruta — salida registrada")
        except Salida.DoesNotExist:
            return CerrarSalida(ok=False, mensaje="Salida no encontrada")


class CancelarVuelo(graphene.Mutation):
    """Cancela un vuelo — genera devoluciones y cancela todas las reservas"""
    class Arguments:
        id_programacion    = graphene.Int(required=True)
        motivo_cancelacion = graphene.String(required=True)
        observaciones      = graphene.String()

    ok                 = graphene.Boolean()
    mensaje            = graphene.String()
    total_devoluciones = graphene.Int()

    def mutate(root, info, id_programacion, motivo_cancelacion, observaciones=None):
        try:
            prog = ProgramacionVuelo.objects.get(pk=id_programacion)

            salida, _ = Salida.objects.get_or_create(id_programacion=prog)
            salida.estado             = 'cancelada'
            salida.motivo_cancelacion = motivo_cancelacion
            salida.observaciones      = observaciones
            salida.save()

            prog.estado             = 'cancelado'
            prog.motivo_cancelacion = motivo_cancelacion
            prog.save()

            # Cancelar reservas pendientes
            reservas_pendientes = Reserva.objects.filter(
                id_asiento_vuelo__id_programacion=prog,
                estado='pendiente'
            )
            for reserva in reservas_pendientes:
                reserva.id_asiento_vuelo.estado = 'disponible'
                reserva.id_asiento_vuelo.save()
                reserva.estado            = 'cancelada'
                reserva.fecha_cancelacion = timezone.now()
                reserva.save()
                try:
                    ticket        = reserva.ticket
                    ticket.estado = 'anulado'
                    ticket.save()
                except Exception:
                    pass

            # Generar devoluciones para reservas confirmadas
            reservas_confirmadas = Reserva.objects.filter(
                id_asiento_vuelo__id_programacion=prog,
                estado='confirmada'
            ).select_related('id_asiento_vuelo__id_asiento', 'id_cliente')

            total = 0
            for reserva in reservas_confirmadas:
                ticket = getattr(reserva, 'ticket', None)
                if not ticket:
                    continue

                clase      = reserva.id_asiento_vuelo.id_asiento.clase
                porcentaje = Devolucion.calcular_porcentaje(
                    clase=clase, motivo=motivo_cancelacion, tiene_oferta=False
                )
                monto_reembolso = float(ticket.precio) * porcentaje / 100

                dev, creada = Devolucion.objects.get_or_create(
                    id_ticket=ticket,
                    defaults={
                        'motivo':               motivo_cancelacion,
                        'porcentaje_reembolso': porcentaje,
                        'monto_original':       ticket.precio,
                        'monto_reembolso':      round(monto_reembolso, 2),
                        'estado':               'pendiente',
                    }
                )

                # Cancelar la reserva confirmada también
                reserva.estado            = 'cancelada'
                reserva.fecha_cancelacion = timezone.now()
                reserva.save()
                reserva.id_asiento_vuelo.estado = 'disponible'
                reserva.id_asiento_vuelo.save()
                prog.asiento_vendido = max(0, prog.asiento_vendido - 1)

                try:
                    crear_notificacion(
                        titulo=f"Vuelo {prog.codigo_vuelo} cancelado",
                        mensaje=(
                            f"Su vuelo {prog.codigo_vuelo} fue cancelado por {motivo_cancelacion}. "
                            f"Se procesará una devolución del {porcentaje}% (Bs. {round(monto_reembolso, 2)})."
                        ),
                        tipo='cancelacion',
                        id_cliente=reserva.id_cliente.id_cliente,
                        referencia_id=prog.id_programacion,
                        referencia_tipo='programacion_vuelo'
                    )
                except Exception:
                    pass

                total += 1

            prog.save()

            return CancelarVuelo(
                ok=True,
                mensaje=f"Vuelo cancelado — {total} devoluciones generadas",
                total_devoluciones=total
            )
        except ProgramacionVuelo.DoesNotExist:
            return CancelarVuelo(ok=False, mensaje="Vuelo no encontrado")


class ProcesarDevolucion(graphene.Mutation):
    """Marca una devolución como procesada y registra el egreso"""
    class Arguments:
        id_devolucion = graphene.Int(required=True)
        observaciones = graphene.String()

    devolucion = graphene.Field(DevolucionType)
    ok         = graphene.Boolean()
    mensaje    = graphene.String()

    def mutate(root, info, id_devolucion, observaciones=None):
        try:
            devolucion = Devolucion.objects.get(pk=id_devolucion)
            if devolucion.estado == 'procesada':
                return ProcesarDevolucion(ok=False, mensaje="Devolución ya procesada")

            devolucion.estado          = 'procesada'
            devolucion.fecha_procesado = timezone.now()
            if observaciones:
                devolucion.observaciones = observaciones
            devolucion.save()

            # Registrar egreso automáticamente
            try:
                from finanzas.models import Egreso
                cliente  = devolucion.id_ticket.id_reserva.id_cliente
                prog     = devolucion.id_ticket.id_reserva.id_asiento_vuelo.id_programacion
                Egreso.objects.create(
                    id_devolucion=devolucion.id_devolucion,
                    concepto=f"Devolución {devolucion.id_ticket.codigo_ticket} — {cliente.get_nombre_completo()} — {prog.codigo_vuelo}",
                    tipo='devolucion',
                    monto=devolucion.monto_reembolso,
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error al registrar egreso: {e}")

            # Notificar cliente
            try:
                cliente = devolucion.id_ticket.id_reserva.id_cliente
                crear_notificacion(
                    titulo="Devolución procesada",
                    mensaje=f"Su devolución de Bs. {devolucion.monto_reembolso} ha sido procesada.",
                    tipo='devolucion',
                    id_cliente=cliente.id_cliente,
                    referencia_id=devolucion.id_devolucion,
                    referencia_tipo='devolucion'
                )
            except Exception:
                pass

            return ProcesarDevolucion(
                devolucion=devolucion, ok=True,
                mensaje=f"Devolución de Bs. {devolucion.monto_reembolso} procesada"
            )
        except Devolucion.DoesNotExist:
            return ProcesarDevolucion(ok=False, mensaje="Devolución no encontrada")


class SolicitarDevolucionCliente(graphene.Mutation):
    class Arguments:
        id_ticket     = graphene.Int(required=True)
        observaciones = graphene.String()

    devolucion = graphene.Field(DevolucionType)
    ok         = graphene.Boolean()
    mensaje    = graphene.String()

    def mutate(root, info, id_ticket, observaciones=None):
        try:
            ticket = Ticket.objects.select_related(
                'id_reserva__id_asiento_vuelo__id_asiento',
                'id_reserva__id_cliente',
            ).get(pk=id_ticket)

            if hasattr(ticket, 'devolucion'):
                return SolicitarDevolucionCliente(ok=False, mensaje="Ya existe una devolución para este ticket")

            reserva      = ticket.id_reserva
            clase        = reserva.id_asiento_vuelo.id_asiento.clase

            from vuelos.models import OfertaVuelo
            prog         = reserva.id_asiento_vuelo.id_programacion
            tiene_oferta = OfertaVuelo.objects.filter(id_programacion=prog, clase=clase, activo=True).exists()

            porcentaje      = Devolucion.calcular_porcentaje(clase=clase, motivo='cliente_cancela', tiene_oferta=tiene_oferta)
            monto_reembolso = float(ticket.precio) * porcentaje / 100

            devolucion = Devolucion.objects.create(
                id_ticket=ticket,
                motivo='cliente_cancela',
                porcentaje_reembolso=porcentaje,
                monto_original=ticket.precio,
                monto_reembolso=round(monto_reembolso, 2),
                estado='pendiente',
                observaciones=observaciones
            )

            if porcentaje > 0:
                reserva.estado = 'cancelada'
                reserva.save()
                reserva.id_asiento_vuelo.estado = 'disponible'
                reserva.id_asiento_vuelo.save()
                prog.asiento_vendido = max(0, prog.asiento_vendido - 1)
                prog.save()

            return SolicitarDevolucionCliente(
                devolucion=devolucion, ok=True,
                mensaje=f"Devolución solicitada — {porcentaje}% — Bs. {round(monto_reembolso, 2)}"
            )
        except Ticket.DoesNotExist:
            return SolicitarDevolucionCliente(ok=False, mensaje="Ticket no encontrado")


# ── MUTATION CLASS ────────────────────────────────────────────────────────────
class Mutation(graphene.ObjectType):
    abrir_salida                 = AbrirSalida.Field()
    marcar_abordaje              = MarcarAbordaje.Field()
    cerrar_salida                = CerrarSalida.Field()
    cancelar_vuelo               = CancelarVuelo.Field()
    procesar_devolucion          = ProcesarDevolucion.Field()
    solicitar_devolucion_cliente = SolicitarDevolucionCliente.Field()