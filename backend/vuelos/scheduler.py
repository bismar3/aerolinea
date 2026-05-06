from apscheduler.schedulers.background import BackgroundScheduler
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def verificar_vuelos_sin_cupos():
    """
    Verifica vuelos programados/reprogramados que salen en los próximos 30 minutos
    y NO alcanzaron el mínimo de ocupación. Los cancela automáticamente.
    IMPORTANTE: Solo cancela si NO cumple el mínimo — nunca cancela vuelos llenos.
    """
    try:
        from vuelos.models import ProgramacionVuelo, Reprogramacion
        from datetime import timedelta

        ahora  = timezone.localtime(timezone.now())
        limite = ahora + timedelta(minutes=30)

        # Solo vuelos que salen en los próximos 30 min
        vuelos = ProgramacionVuelo.objects.filter(
            estado__in=['programado', 'reprogramado'],
            fecha_salida=ahora.date(),
            hora_salida__lte=limite.time(),
            hora_salida__gte=ahora.time(),
        )

        for vuelo in vuelos:
            # Solo cancelar si NO cumple el mínimo
            if vuelo.cumple_minimo():
                logger.info(f"Vuelo {vuelo.codigo_vuelo} cumple mínimo ({vuelo.porcentaje_ocupacion()}%) — no se cancela")
                continue

            logger.info(f"Cancelando vuelo {vuelo.codigo_vuelo} por falta de cupos ({vuelo.porcentaje_ocupacion()}%)")

            vuelo.estado                = 'cancelado'
            vuelo.motivo_cancelacion    = 'falta_cupos'
            vuelo.descripcion_cancelacion = (
                f"Cancelado automáticamente: ocupación {vuelo.porcentaje_ocupacion()}% "
                f"(mínimo requerido: {vuelo.ocupacion_minima}%)"
            )
            vuelo.save()

            Reprogramacion.objects.create(
                id_programacion=vuelo,
                motivo='falta_cupos',
                descripcion=vuelo.descripcion_cancelacion,
                estado='pendiente',
            )

            # Cancelar reservas pendientes del vuelo
            from reservas.models import Reserva
            reservas_pendientes = Reserva.objects.filter(
                id_asiento_vuelo__id_programacion=vuelo,
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

    except Exception as e:
        logger.error(f"Error en verificar_vuelos_sin_cupos: {e}")


def iniciar_scheduler():
    scheduler = BackgroundScheduler(timezone='America/La_Paz')
    scheduler.add_job(
        verificar_vuelos_sin_cupos,
        trigger='interval',
        minutes=5,
        id='verificar_cupos',
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado — verificación de cupos cada 5 minutos")
    return scheduler