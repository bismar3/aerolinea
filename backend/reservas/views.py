import json
import logging
from django.http       import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone

from reservas.models import Reserva, Ticket
from reservas.libelula import consultar_pago

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def callback_pago(request):
    """
    Endpoint que Libélula llama cuando el cliente completa el pago.

    GET /pago/callback/?transaction_id=xxx&invoice_id=xxx&invoice_url=xxx
    """
    # Obtener transaction_id del QueryString
    transaction_id = request.GET.get('transaction_id')
    invoice_id     = request.GET.get('invoice_id', '')
    invoice_url    = request.GET.get('invoice_url', '')

    logger.info(f"Callback Libelula recibido — transaction_id: {transaction_id}")

    if not transaction_id:
        logger.warning("Callback sin transaction_id")
        return JsonResponse({'error': 1, 'mensaje': 'transaction_id requerido'}, status=400)

    # Buscar el ticket con ese id_transaccion
    try:
        ticket = Ticket.objects.select_related(
            'id_reserva__id_cliente',
            'id_reserva__id_asiento_vuelo__id_programacion',
            'id_reserva__id_asiento_vuelo__id_asiento',
        ).get(id_transaccion=transaction_id)
    except Ticket.DoesNotExist:
        logger.error(f"No se encontró ticket con transaction_id: {transaction_id}")
        return JsonResponse({'error': 1, 'mensaje': 'Transaccion no encontrada'}, status=404)

    reserva = ticket.id_reserva

    # Si ya está confirmada no hacer nada
    if reserva.estado == 'confirmada':
        logger.info(f"Reserva {reserva.codigo_reserva} ya estaba confirmada")
        return JsonResponse({'error': 0, 'mensaje': 'Pago ya confirmado'})

    # Verificar con Libélula que el pago es real
    resultado = consultar_pago(transaction_id)

    # Si es simulado (SIM-) o está pagado → confirmar
    es_simulado = transaction_id.startswith('SIM-')
    if not resultado['ok'] and not es_simulado:
        logger.error(f"Error al consultar pago: {resultado['mensaje']}")
        return JsonResponse({'error': 1, 'mensaje': resultado['mensaje']}, status=500)

    if not es_simulado and not resultado.get('pagado', False):
        logger.warning(f"Pago no confirmado por Libelula: {resultado['mensaje']}")
        return JsonResponse({'error': 1, 'mensaje': 'El pago no esta confirmado en Libelula'}, status=400)

    # Confirmar reserva
    reserva.estado = 'confirmada'
    reserva.save()

    # Marcar asiento como vendido
    asiento_vuelo = reserva.id_asiento_vuelo
    asiento_vuelo.estado = 'vendido'
    asiento_vuelo.save()

    # Actualizar contador en programacion
    prog = asiento_vuelo.id_programacion
    prog.asiento_vendido += 1
    prog.save()

    # Actualizar ticket
    ticket.fecha_pago     = timezone.now()
    ticket.estado         = 'emitido'
    if invoice_id:
        ticket.id_transaccion = invoice_id  # guardar ID de factura si hay
    ticket.save()

    logger.info(f"Pago confirmado — Reserva: {reserva.codigo_reserva} — Ticket: {ticket.codigo_ticket}")

    return JsonResponse({
        'error':   0,
        'mensaje': f'Pago confirmado correctamente',
        'ticket':  ticket.codigo_ticket,
        'reserva': reserva.codigo_reserva,
    })