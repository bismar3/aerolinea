import graphene
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from reservas.models import Cliente, Venta, Reserva, Ticket
from vuelos.models import AsientoVuelo, ProgramacionVuelo
from reservas.libelula import registrar_deuda, calcular_precio
from .queries import ClienteType, VentaType, ReservaType, TicketType

CALLBACK_URL = 'https://daybed-ivory-rewire.ngrok-free.dev/pago/callback/'

REEMBOLSO_CLASE = {
    'economica':         0,
    'economica_premium': 0,
    'ejecutiva':         50,
    'primera_clase':     100,
}
REEMBOLSO_BOA = {
    'meteorologia':   50,
    'falta_cupos':    80,
    'administrativo': 100,
    'falla_tecnica':  80,
    'otro':           50,
}


def _registrar_ingreso(ticket):
    """Crea un Ingreso al confirmar el pago de un ticket"""
    try:
        from finanzas.models import Ingreso
        prog   = ticket.id_reserva.id_asiento_vuelo.id_programacion
        ruta   = prog.id_ruta
        origen  = ruta.id_aeropuerto_origen.codigo
        destino = ruta.id_aeropuerto_destino.codigo
        pasajero = ticket.id_reserva.id_cliente.get_nombre_completo()
        Ingreso.objects.get_or_create(
            id_ticket=ticket,
            defaults={
                'concepto': f"Venta pasaje {prog.codigo_vuelo} {origen}→{destino} — {pasajero}",
                'tipo':     'venta_pasaje',
                'monto':    ticket.precio,
            }
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error al registrar ingreso: {e}")


def _confirmar_reserva(reserva, ticket):
    """Confirma reserva y ticket — lógica compartida"""
    ahora = timezone.now()
    reserva.estado     = 'confirmada'
    reserva.fecha_pago = ahora
    reserva.save()

    reserva.id_asiento_vuelo.estado = 'vendido'
    reserva.id_asiento_vuelo.save()

    prog = reserva.id_asiento_vuelo.id_programacion
    prog.asiento_vendido += 1
    prog.save()

    ticket.estado     = 'pagado'
    ticket.fecha_pago = ahora
    ticket.save()

    # Registrar ingreso automáticamente
    _registrar_ingreso(ticket)


# ── CLIENTE ───────────────────────────────────────────────────────────────────
class CrearCliente(graphene.Mutation):
    class Arguments:
        nombre           = graphene.String(required=True)
        apellido_paterno = graphene.String(required=True)
        apellido_materno = graphene.String()
        tipo_documento   = graphene.String(required=True)
        nro_documento    = graphene.String(required=True)
        correo           = graphene.String()
        telefono         = graphene.String()
        nacionalidad     = graphene.String()
        fecha_nacimiento = graphene.Date()

    cliente = graphene.Field(ClienteType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, nombre, apellido_paterno, tipo_documento, nro_documento,
               apellido_materno='', correo=None, telefono=None,
               nacionalidad='boliviana', fecha_nacimiento=None):
        if Cliente.objects.filter(nro_documento=nro_documento).exists():
            return CrearCliente(ok=False, mensaje=f"Ya existe un cliente con documento '{nro_documento}'")
        cliente = Cliente.objects.create(
            nombre=nombre, apellido_paterno=apellido_paterno,
            apellido_materno=apellido_materno, tipo_documento=tipo_documento,
            nro_documento=nro_documento, correo=correo, telefono=telefono,
            nacionalidad=nacionalidad, fecha_nacimiento=fecha_nacimiento,
        )
        return CrearCliente(cliente=cliente, ok=True, mensaje="Cliente registrado correctamente")


class ActualizarCliente(graphene.Mutation):
    class Arguments:
        id_cliente       = graphene.Int(required=True)
        nombre           = graphene.String()
        apellido_paterno = graphene.String()
        apellido_materno = graphene.String()
        correo           = graphene.String()
        telefono         = graphene.String()
        nacionalidad     = graphene.String()

    cliente = graphene.Field(ClienteType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_cliente, **kwargs):
        try:
            cliente = Cliente.objects.get(pk=id_cliente)
            for key, value in kwargs.items():
                if value is not None:
                    setattr(cliente, key, value)
            cliente.save()
            return ActualizarCliente(cliente=cliente, ok=True, mensaje="Cliente actualizado correctamente")
        except Cliente.DoesNotExist:
            return ActualizarCliente(ok=False, mensaje="Cliente no encontrado")


# ── VENTA ─────────────────────────────────────────────────────────────────────
class CrearVenta(graphene.Mutation):
    class Arguments:
        canal = graphene.String()

    venta   = graphene.Field(VentaType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, canal='caja'):
        venta = Venta.objects.create(canal=canal)
        return CrearVenta(venta=venta, ok=True, mensaje=f"Venta {venta.codigo_venta} iniciada")


# ── RESERVA ───────────────────────────────────────────────────────────────────
class CrearReserva(graphene.Mutation):
    class Arguments:
        id_cliente       = graphene.Int(required=True)
        id_asiento_vuelo = graphene.Int(required=True)
        canal            = graphene.String()
        id_venta         = graphene.Int()
        observaciones    = graphene.String()

    reserva = graphene.Field(ReservaType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_cliente, id_asiento_vuelo, canal='caja', id_venta=None, observaciones=None):
        try:
            cliente       = Cliente.objects.get(pk=id_cliente)
            asiento_vuelo = AsientoVuelo.objects.get(pk=id_asiento_vuelo)

            if asiento_vuelo.estado != 'disponible':
                return CrearReserva(ok=False, mensaje=f"El asiento no está disponible — estado: {asiento_vuelo.estado}")

            venta = None
            if id_venta:
                try:
                    venta = Venta.objects.get(pk=id_venta)
                except Venta.DoesNotExist:
                    return CrearReserva(ok=False, mensaje="Venta no encontrada")

            asiento_vuelo.estado = 'reservado'
            asiento_vuelo.save()

            reserva = Reserva.objects.create(
                id_cliente=cliente, id_asiento_vuelo=asiento_vuelo,
                id_venta=venta, canal=canal,
                fecha_expiracion=timezone.now() + timedelta(minutes=30),
                estado='pendiente', observaciones=observaciones
            )
            return CrearReserva(reserva=reserva, ok=True, mensaje=f"Reserva {reserva.codigo_reserva} creada.")
        except Cliente.DoesNotExist:
            return CrearReserva(ok=False, mensaje="Cliente no encontrado")
        except AsientoVuelo.DoesNotExist:
            return CrearReserva(ok=False, mensaje="Asiento de vuelo no encontrado")


class CancelarReserva(graphene.Mutation):
    class Arguments:
        id_reserva = graphene.Int(required=True)
        motivo     = graphene.String()

    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_reserva, motivo=None):
        try:
            reserva = Reserva.objects.get(pk=id_reserva)
            if reserva.estado == 'confirmada':
                return CancelarReserva(ok=False, mensaje="No se puede cancelar una reserva confirmada desde aquí.")

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

            return CancelarReserva(ok=True, mensaje="Reserva cancelada correctamente")
        except Reserva.DoesNotExist:
            return CancelarReserva(ok=False, mensaje="Reserva no encontrada")


class EditarReserva(graphene.Mutation):
    class Arguments:
        id_reserva       = graphene.Int(required=True)
        id_asiento_vuelo = graphene.Int(required=True)

    reserva = graphene.Field(ReservaType)
    ok      = graphene.Boolean()
    mensaje = graphene.String()

    def mutate(root, info, id_reserva, id_asiento_vuelo):
        ORDEN_CLASE = ['economica', 'economica_premium', 'ejecutiva', 'primera_clase']
        try:
            reserva  = Reserva.objects.get(pk=id_reserva)
            nuevo_av = AsientoVuelo.objects.select_related('id_asiento', 'id_programacion').get(pk=id_asiento_vuelo)

            if reserva.estado != 'pendiente':
                return EditarReserva(ok=False, mensaje="Solo se pueden editar reservas pendientes")

            clase_actual = reserva.id_asiento_vuelo.id_asiento.clase
            clase_nueva  = nuevo_av.id_asiento.clase
            vuelo_actual = reserva.id_asiento_vuelo.id_programacion
            vuelo_nuevo  = nuevo_av.id_programacion

            idx_actual = ORDEN_CLASE.index(clase_actual) if clase_actual in ORDEN_CLASE else 0
            idx_nueva  = ORDEN_CLASE.index(clase_nueva)  if clase_nueva  in ORDEN_CLASE else 0

            if idx_nueva < idx_actual:
                return EditarReserva(ok=False, mensaje="No puede bajar de clase")

            if clase_actual in ('economica', 'economica_premium') and vuelo_actual.pk != vuelo_nuevo.pk:
                return EditarReserva(ok=False, mensaje="Con clase económica no puede cambiar de vuelo")

            if nuevo_av.estado != 'disponible':
                return EditarReserva(ok=False, mensaje="El asiento seleccionado no está disponible")

            reserva.id_asiento_vuelo.estado = 'disponible'
            reserva.id_asiento_vuelo.save()

            nuevo_av.estado = 'reservado'
            nuevo_av.save()

            reserva.id_asiento_vuelo = nuevo_av
            reserva.save()

            return EditarReserva(reserva=reserva, ok=True, mensaje="Reserva actualizada correctamente")
        except Reserva.DoesNotExist:
            return EditarReserva(ok=False, mensaje="Reserva no encontrada")
        except AsientoVuelo.DoesNotExist:
            return EditarReserva(ok=False, mensaje="Asiento no encontrado")


class CambiarReservaConfirmada(graphene.Mutation):
    class Arguments:
        id_reserva       = graphene.Int(required=True)
        id_asiento_vuelo = graphene.Int(required=True)

    reserva       = graphene.Field(ReservaType)
    ok            = graphene.Boolean()
    mensaje       = graphene.String()
    diferencia    = graphene.Float()
    requiere_pago = graphene.Boolean()

    def mutate(root, info, id_reserva, id_asiento_vuelo):
        ORDEN_CLASE = ['economica', 'economica_premium', 'ejecutiva', 'primera_clase']
        try:
            reserva  = Reserva.objects.get(pk=id_reserva)
            nuevo_av = AsientoVuelo.objects.select_related('id_asiento', 'id_programacion').get(pk=id_asiento_vuelo)

            if reserva.estado != 'confirmada':
                return CambiarReservaConfirmada(ok=False, mensaje="Solo se pueden cambiar reservas confirmadas")

            clase_actual = reserva.id_asiento_vuelo.id_asiento.clase
            clase_nueva  = nuevo_av.id_asiento.clase
            vuelo_actual = reserva.id_asiento_vuelo.id_programacion
            vuelo_nuevo  = nuevo_av.id_programacion

            idx_actual = ORDEN_CLASE.index(clase_actual) if clase_actual in ORDEN_CLASE else 0
            idx_nueva  = ORDEN_CLASE.index(clase_nueva)  if clase_nueva  in ORDEN_CLASE else 0

            if idx_nueva < idx_actual:
                return CambiarReservaConfirmada(ok=False, mensaje="No puede bajar de clase")

            if clase_actual in ('economica', 'economica_premium') and vuelo_actual.pk != vuelo_nuevo.pk:
                return CambiarReservaConfirmada(ok=False, mensaje="Con clase económica no puede cambiar de vuelo")

            if nuevo_av.estado != 'disponible':
                return CambiarReservaConfirmada(ok=False, mensaje="El asiento seleccionado no está disponible")

            precio_actual = Decimal(str(calcular_precio(reserva)))
            precio_nuevo  = Decimal(str(nuevo_av.id_programacion.precio_base))
            diferencia    = float(max(Decimal('0'), precio_nuevo - precio_actual))

            reserva.id_asiento_vuelo.estado = 'disponible'
            reserva.id_asiento_vuelo.save()
            vuelo_actual.asiento_vendido = max(0, vuelo_actual.asiento_vendido - 1)
            vuelo_actual.save()

            nuevo_av.estado = 'vendido'
            nuevo_av.save()
            vuelo_nuevo.asiento_vendido += 1
            vuelo_nuevo.save()

            reserva.id_asiento_vuelo = nuevo_av
            reserva.save()

            return CambiarReservaConfirmada(
                reserva=reserva, ok=True,
                mensaje="Reserva cambiada correctamente",
                diferencia=diferencia, requiere_pago=diferencia > 0
            )
        except Reserva.DoesNotExist:
            return CambiarReservaConfirmada(ok=False, mensaje="Reserva no encontrada")
        except AsientoVuelo.DoesNotExist:
            return CambiarReservaConfirmada(ok=False, mensaje="Asiento no encontrado")


class SolicitarReembolso(graphene.Mutation):
    """
    Verifica condiciones de reembolso Y crea la Devolucion en BD si aplica.
    """
    class Arguments:
        id_reserva = graphene.Int(required=True)

    ok                 = graphene.Boolean()
    mensaje            = graphene.String()
    porcentaje         = graphene.Int()
    monto_reembolso    = graphene.Float()
    motivo_cancelacion = graphene.String()

    def mutate(root, info, id_reserva):
        try:
            reserva = Reserva.objects.select_related(
                'id_asiento_vuelo__id_asiento',
                'id_asiento_vuelo__id_programacion',
            ).get(pk=id_reserva)

            if reserva.estado != 'cancelada':
                return SolicitarReembolso(ok=False, mensaje="La reserva no está cancelada")

            clase = reserva.id_asiento_vuelo.id_asiento.clase
            prog  = reserva.id_asiento_vuelo.id_programacion

            if prog.estado == 'cancelado' and prog.motivo_cancelacion:
                porcentaje = REEMBOLSO_BOA.get(prog.motivo_cancelacion, 0)
                motivo_bd  = prog.motivo_cancelacion
                motivo_txt = f"Cancelado por BOA: {prog.motivo_cancelacion}"
            else:
                porcentaje = REEMBOLSO_CLASE.get(clase, 0)
                motivo_bd  = 'cliente_cancela'
                motivo_txt = f"Cancelación cliente — clase {clase}"

            if porcentaje == 0:
                return SolicitarReembolso(
                    ok=False,
                    mensaje="Esta reserva no tiene derecho a reembolso según la política de la clase adquirida",
                    porcentaje=0, monto_reembolso=0, motivo_cancelacion=motivo_txt
                )

            try:
                precio_pagado = float(reserva.ticket.precio)
                ticket        = reserva.ticket
            except Exception:
                return SolicitarReembolso(ok=False, mensaje="No se encontró el ticket de esta reserva")

            monto = round(precio_pagado * porcentaje / 100, 2)

            # Crear Devolucion en BD si no existe
            from salida.models import Devolucion
            dev, creada = Devolucion.objects.get_or_create(
                id_ticket=ticket,
                defaults={
                    'motivo':                motivo_bd,
                    'porcentaje_reembolso':  porcentaje,
                    'monto_original':        ticket.precio,
                    'monto_reembolso':       monto,
                    'estado':                'pendiente',
                    'observaciones':         f"Solicitud desde módulo de reservas — {motivo_txt}",
                }
            )

            return SolicitarReembolso(
                ok=True,
                mensaje=f"Reembolso del {porcentaje}% {'registrado' if creada else 'ya existía'} — Bs. {monto}",
                porcentaje=porcentaje,
                monto_reembolso=monto,
                motivo_cancelacion=motivo_txt
            )
        except Reserva.DoesNotExist:
            return SolicitarReembolso(ok=False, mensaje="Reserva no encontrada")


# ── PAGO INDIVIDUAL ───────────────────────────────────────────────────────────
class GenerarPagoQR(graphene.Mutation):
    class Arguments:
        id_reserva   = graphene.Int(required=True)
        callback_url = graphene.String()

    ok             = graphene.Boolean()
    mensaje        = graphene.String()
    url_pago       = graphene.String()
    qr_url         = graphene.String()
    id_transaccion = graphene.String()
    ticket         = graphene.Field(TicketType)

    def mutate(root, info, id_reserva, callback_url=None):
        try:
            reserva = Reserva.objects.select_related(
                'id_cliente',
                'id_asiento_vuelo__id_programacion__id_ruta__id_aeropuerto_origen',
                'id_asiento_vuelo__id_programacion__id_ruta__id_aeropuerto_destino',
                'id_asiento_vuelo__id_asiento',
            ).get(pk=id_reserva)

            if reserva.estado != 'pendiente':
                return GenerarPagoQR(ok=False, mensaje=f"La reserva no está pendiente — estado: {reserva.estado}")

            if hasattr(reserva, 'ticket') and reserva.ticket.estado == 'emitido':
                t = reserva.ticket
                return GenerarPagoQR(ok=True, mensaje="QR ya generado — esperando pago",
                    url_pago=t.url_pasarela, qr_url=t.qr_url,
                    id_transaccion=t.id_transaccion, ticket=t)

            precio    = Decimal(str(calcular_precio(reserva)))
            url_cb    = callback_url or CALLBACK_URL
            resultado = registrar_deuda(reserva, float(precio), url_cb)

            if not resultado['ok']:
                return GenerarPagoQR(ok=False, mensaje=resultado['mensaje'])

            metodo = 'qr_caja' if reserva.canal == 'caja' else 'qr_online'
            ticket = Ticket.objects.create(
                id_reserva=reserva, precio=precio, metodo_pago=metodo,
                id_transaccion=resultado['id_transaccion'],
                url_pasarela=resultado['url_pasarela'],
                qr_url=resultado['qr_url'], estado='emitido'
            )
            return GenerarPagoQR(
                ok=True, mensaje=resultado['mensaje'],
                url_pago=ticket.url_pasarela, qr_url=ticket.qr_url,
                id_transaccion=ticket.id_transaccion, ticket=ticket
            )
        except Reserva.DoesNotExist:
            return GenerarPagoQR(ok=False, mensaje="Reserva no encontrada")


class ConfirmarPago(graphene.Mutation):
    """Callback de Libélula — confirma pago QR"""
    class Arguments:
        codigo_reserva = graphene.String(required=True)
        id_transaccion = graphene.String()

    ok      = graphene.Boolean()
    mensaje = graphene.String()
    ticket  = graphene.Field(TicketType)

    def mutate(root, info, codigo_reserva, id_transaccion=None):
        try:
            reserva = Reserva.objects.get(codigo_reserva=codigo_reserva)
            if reserva.estado == 'confirmada':
                return ConfirmarPago(ok=True, mensaje="Reserva ya confirmada", ticket=reserva.ticket)

            ticket = reserva.ticket
            if id_transaccion:
                ticket.id_transaccion = id_transaccion

            _confirmar_reserva(reserva, ticket)

            return ConfirmarPago(ok=True, mensaje=f"Pago QR confirmado — Ticket {ticket.codigo_ticket}", ticket=ticket)
        except Reserva.DoesNotExist:
            return ConfirmarPago(ok=False, mensaje="Reserva no encontrada")
        except Exception as e:
            return ConfirmarPago(ok=False, mensaje=str(e))


class ConfirmarPagoEfectivo(graphene.Mutation):
    class Arguments:
        id_reserva     = graphene.Int(required=True)
        monto_recibido = graphene.Float(required=True)
        b200 = graphene.Int(); b100 = graphene.Int(); b50 = graphene.Int(); b20 = graphene.Int()
        b10  = graphene.Int(); b5   = graphene.Int(); b2  = graphene.Int(); b1  = graphene.Int()

    ok      = graphene.Boolean()
    mensaje = graphene.String()
    ticket  = graphene.Field(TicketType)
    vuelto  = graphene.Float()

    def mutate(root, info, id_reserva, monto_recibido,
               b200=0, b100=0, b50=0, b20=0, b10=0, b5=0, b2=0, b1=0):
        try:
            reserva = Reserva.objects.get(pk=id_reserva)
            if reserva.estado != 'pendiente':
                return ConfirmarPagoEfectivo(ok=False, mensaje=f"La reserva no está pendiente — estado: {reserva.estado}")

            precio    = Decimal(str(calcular_precio(reserva)))
            monto_dec = Decimal(str(monto_recibido))

            if monto_dec < precio:
                return ConfirmarPagoEfectivo(ok=False, mensaje=f"Monto insuficiente. Precio: Bs. {precio}, recibido: Bs. {monto_dec}")

            vuelto  = float(monto_dec - precio)
            detalle = {'200': b200, '100': b100, '50': b50, '20': b20, '10': b10, '5': b5, '2': b2, '1': b1}

            ticket = Ticket.objects.create(
                id_reserva=reserva, precio=precio, metodo_pago='efectivo',
                monto_recibido=monto_dec, vuelto=Decimal(str(vuelto)),
                detalle_efectivo=detalle, estado='pagado'
            )

            _confirmar_reserva(reserva, ticket)

            return ConfirmarPagoEfectivo(
                ok=True,
                mensaje=f"Pago confirmado — Ticket {ticket.codigo_ticket} — Vuelto: Bs. {vuelto:.2f}",
                ticket=ticket, vuelto=vuelto
            )
        except Reserva.DoesNotExist:
            return ConfirmarPagoEfectivo(ok=False, mensaje="Reserva no encontrada")


# ── PAGO VENTA ────────────────────────────────────────────────────────────────
class ConfirmarPagoVentaEfectivo(graphene.Mutation):
    class Arguments:
        id_venta       = graphene.Int(required=True)
        monto_recibido = graphene.Float(required=True)
        b200 = graphene.Int(); b100 = graphene.Int(); b50 = graphene.Int(); b20 = graphene.Int()
        b10  = graphene.Int(); b5   = graphene.Int(); b2  = graphene.Int(); b1  = graphene.Int()

    ok      = graphene.Boolean()
    mensaje = graphene.String()
    venta   = graphene.Field(VentaType)
    vuelto  = graphene.Float()

    def mutate(root, info, id_venta, monto_recibido,
               b200=0, b100=0, b50=0, b20=0, b10=0, b5=0, b2=0, b1=0):
        try:
            venta    = Venta.objects.get(pk=id_venta)
            reservas = venta.reservas.filter(estado='pendiente')

            if not reservas.exists():
                return ConfirmarPagoVentaEfectivo(ok=False, mensaje="No hay reservas pendientes en esta venta")

            total = Decimal('0')
            for r in reservas:
                total += Decimal(str(calcular_precio(r)))

            monto_dec = Decimal(str(monto_recibido))
            if monto_dec < total:
                return ConfirmarPagoVentaEfectivo(ok=False, mensaje=f"Monto insuficiente. Total: Bs. {total}, recibido: Bs. {monto_dec}")

            vuelto  = float(monto_dec - total)
            detalle = {'200': b200, '100': b100, '50': b50, '20': b20, '10': b10, '5': b5, '2': b2, '1': b1}
            tickets_creados = []

            for reserva in reservas:
                precio = Decimal(str(calcular_precio(reserva)))
                ticket = Ticket.objects.create(
                    id_reserva=reserva, precio=precio,
                    metodo_pago='efectivo', estado='pagado'
                )
                _confirmar_reserva(reserva, ticket)
                tickets_creados.append(ticket.codigo_ticket)

            venta.estado           = 'confirmada'
            venta.metodo_pago      = 'efectivo'
            venta.total            = total
            venta.monto_recibido   = monto_dec
            venta.vuelto           = Decimal(str(vuelto))
            venta.detalle_efectivo = detalle
            venta.fecha_pago       = timezone.now()
            venta.save()

            return ConfirmarPagoVentaEfectivo(
                ok=True,
                mensaje=f"Venta confirmada — {len(tickets_creados)} tickets — Vuelto: Bs. {vuelto:.2f}",
                venta=venta, vuelto=vuelto
            )
        except Venta.DoesNotExist:
            return ConfirmarPagoVentaEfectivo(ok=False, mensaje="Venta no encontrada")


class ConfirmarPagoVentaQR(graphene.Mutation):
    class Arguments:
        id_venta     = graphene.Int(required=True)
        callback_url = graphene.String()

    ok             = graphene.Boolean()
    mensaje        = graphene.String()
    url_pago       = graphene.String()
    qr_url         = graphene.String()
    id_transaccion = graphene.String()
    venta          = graphene.Field(VentaType)

    def mutate(root, info, id_venta, callback_url=None):
        try:
            venta    = Venta.objects.get(pk=id_venta)
            reservas = venta.reservas.filter(estado='pendiente').select_related(
                'id_cliente',
                'id_asiento_vuelo__id_programacion__id_ruta__id_aeropuerto_origen',
                'id_asiento_vuelo__id_programacion__id_ruta__id_aeropuerto_destino',
                'id_asiento_vuelo__id_asiento',
            )
            if not reservas.exists():
                return ConfirmarPagoVentaQR(ok=False, mensaje="No hay reservas pendientes")

            total = Decimal('0')
            for r in reservas:
                total += Decimal(str(calcular_precio(r)))

            venta.total = total
            venta.save()

            primera   = reservas.first()
            url_cb    = callback_url or CALLBACK_URL
            resultado = registrar_deuda(primera, float(total), url_cb)

            if not resultado['ok']:
                return ConfirmarPagoVentaQR(ok=False, mensaje=resultado['mensaje'])

            for reserva in reservas:
                precio = Decimal(str(calcular_precio(reserva)))
                Ticket.objects.create(
                    id_reserva=reserva, precio=precio,
                    metodo_pago='qr_caja',
                    id_transaccion=resultado['id_transaccion'],
                    url_pasarela=resultado['url_pasarela'],
                    qr_url=resultado['qr_url'],
                    estado='emitido'
                )

            venta.metodo_pago = 'qr_caja'
            venta.save()

            return ConfirmarPagoVentaQR(
                ok=True, mensaje=f"QR generado — Total Bs. {total}",
                url_pago=resultado['url_pasarela'],
                qr_url=resultado['qr_url'],
                id_transaccion=resultado['id_transaccion'],
                venta=venta
            )
        except Venta.DoesNotExist:
            return ConfirmarPagoVentaQR(ok=False, mensaje="Venta no encontrada")


# ── MUTATION CLASS ────────────────────────────────────────────────────────────
class Mutation(graphene.ObjectType):
    crear_cliente                 = CrearCliente.Field()
    actualizar_cliente            = ActualizarCliente.Field()
    crear_venta                   = CrearVenta.Field()
    crear_reserva                 = CrearReserva.Field()
    cancelar_reserva              = CancelarReserva.Field()
    editar_reserva                = EditarReserva.Field()
    cambiar_reserva_confirmada    = CambiarReservaConfirmada.Field()
    solicitar_reembolso           = SolicitarReembolso.Field()
    generar_pago_qr               = GenerarPagoQR.Field()
    confirmar_pago                = ConfirmarPago.Field()
    confirmar_pago_efectivo       = ConfirmarPagoEfectivo.Field()
    confirmar_pago_venta_efectivo = ConfirmarPagoVentaEfectivo.Field()
    confirmar_pago_venta_qr       = ConfirmarPagoVentaQR.Field()