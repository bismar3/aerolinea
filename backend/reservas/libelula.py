import requests
from decimal import Decimal

# ── Configuración ─────────────────────────────────────────────────────────────
LIBELULA_APPKEY   = '11bb10ce-68ba-4af1-8eb7-4e6624fed729'  # App key de pruebas
LIBELULA_BASE_URL = 'https://api.libelula.bo/rest'


# ── Registrar deuda ───────────────────────────────────────────────────────────
def registrar_deuda(reserva, precio, callback_url):
    """
    Registra una deuda en Libélula y retorna los datos del QR y pasarela.
    Retorna dict con: ok, id_transaccion, url_pasarela, qr_url, mensaje
    """
    prog    = reserva.id_asiento_vuelo.id_programacion
    ruta    = prog.id_ruta
    asiento = reserva.id_asiento_vuelo.id_asiento
    cliente = reserva.id_cliente

    concepto = (
        f"Pasaje {prog.codigo_vuelo} - "
        f"{ruta.id_aeropuerto_origen.codigo} a {ruta.id_aeropuerto_destino.codigo} - "
        f"Asiento {asiento.numero}"
    )

    payload = {
        "appkey":        LIBELULA_APPKEY,
        "email_cliente": cliente.correo or "sin-correo@boa.bo",
        "identificador": reserva.codigo_reserva,
        "callback_url":  callback_url,
        "descripcion":   concepto,
        "nombre_cliente":   cliente.nombre,
        "apellido_cliente": cliente.apellido_paterno,
        "ci":            cliente.nro_documento,
        "moneda":        "BOB",
        "lineas_detalle_deuda": [
            {
                "concepto":           concepto,
                "cantidad":           1,
                "costo_unitario":     float(precio),
                "descuento_unitario": 0
            }
        ]
    }

    try:
        resp = requests.post(
            f"{LIBELULA_BASE_URL}/deuda/registrar",
            json=payload,
            timeout=10
        )
        data = resp.json()

        if not data.get('error'):
            return {
                'ok':            True,
                'id_transaccion': data.get('id_transaccion'),
                'url_pasarela':  data.get('url_pasarela_pagos'),
                'qr_url':        data.get('qr_simple_url'),
                'mensaje':       'QR generado correctamente',
            }
        else:
            return {
                'ok':      False,
                'mensaje': f"Error Libelula: {data.get('mensaje', 'Error desconocido')}",
            }

    except requests.exceptions.RequestException as e:
        # Modo simulado para pruebas sin conexión
        return {
            'ok':            True,
            'id_transaccion': f"SIM-{reserva.codigo_reserva}",
            'url_pasarela':  f"https://api.libelula.bo/pago-simulado/{reserva.codigo_reserva}",
            'qr_url':        None,
            'mensaje':       f"QR simulado (Libelula no disponible: {str(e)})",
        }


# ── Consultar pago ────────────────────────────────────────────────────────────
def consultar_pago(transaction_id):
    """
    Consulta el estado de un pago en Libélula por transaction_id.
    Retorna dict con: ok, pagado, mensaje, datos
    """
    payload = {
        "appkey":         LIBELULA_APPKEY,
        "id_transaccion": transaction_id,
    }

    try:
        resp = requests.post(
            f"{LIBELULA_BASE_URL}/deuda/consultar_deudas/por_identificador",
            json=payload,
            timeout=10
        )
        data = resp.json()

        if data.get('error') == 0:
            datos = data.get('datos', {})
            # Verificar si el pago está confirmado
            pagado = datos.get('estado_transaccion') in ['PAGADO', 'COMPLETADO', 2, '2']
            return {
                'ok':      True,
                'pagado':  pagado,
                'datos':   datos,
                'mensaje': data.get('mensaje', ''),
            }
        else:
            return {
                'ok':      False,
                'pagado':  False,
                'mensaje': f"Error al consultar: {data.get('mensaje', 'Error desconocido')}",
            }

    except requests.exceptions.RequestException as e:
        return {
            'ok':      False,
            'pagado':  False,
            'mensaje': f"No se pudo conectar con Libelula: {str(e)}",
        }


# ── Calcular precio ───────────────────────────────────────────────────────────
def calcular_precio(reserva):
    """
    Calcula el precio final del asiento según clase, configuración e incrementos.
    """
    from vuelos.models import ConfiguracionPrecio, OfertaVuelo

    prog   = reserva.id_asiento_vuelo.id_programacion
    clase  = reserva.id_asiento_vuelo.id_asiento.clase
    config = ConfiguracionPrecio.get_activa()

    incrementos = {
        'economica':         Decimal('0'),
        'economica_premium': config.incremento_economica_premium if config else Decimal('10'),
        'ejecutiva':         config.incremento_ejecutiva         if config else Decimal('15'),
        'primera_clase':     config.incremento_primera_clase     if config else Decimal('20'),
    }

    precio = float(prog.precio_base) * (1 + float(incrementos.get(clase, 0)) / 100)

    oferta = OfertaVuelo.objects.filter(
        id_programacion=prog, clase=clase, activo=True
    ).first()
    if oferta:
        precio = precio * (1 - float(oferta.porcentaje_descuento) / 100)

    return round(precio, 2)