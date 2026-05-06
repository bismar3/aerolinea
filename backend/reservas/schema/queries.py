import graphene
from graphene_django import DjangoObjectType
from reservas.models import Cliente, Venta, Reserva, Ticket


class ClienteType(DjangoObjectType):
    nombre_completo = graphene.String()

    class Meta:
        model  = Cliente
        fields = (
            'id_cliente', 'nombre', 'apellido_paterno', 'apellido_materno',
            'tipo_documento', 'nro_documento', 'correo', 'telefono',
            'nacionalidad', 'fecha_nacimiento'
        )
        convert_choices_to_enum = False

    def resolve_nombre_completo(self, info):
        return self.get_nombre_completo()


class VentaType(DjangoObjectType):
    total_reservas = graphene.Int()

    class Meta:
        model  = Venta
        fields = (
            'id_venta', 'codigo_venta', 'canal', 'metodo_pago',
            'total', 'estado', 'monto_recibido', 'vuelto', 'detalle_efectivo',
            'fecha_creacion', 'fecha_pago', 'fecha_cancelacion',
            'reservas'
        )
        convert_choices_to_enum = False

    def resolve_total_reservas(self, info):
        return self.reservas.count()


class ReservaType(DjangoObjectType):
    class Meta:
        model  = Reserva
        fields = (
            'id_reserva', 'codigo_reserva', 'id_cliente', 'id_asiento_vuelo',
            'id_venta', 'canal', 'fecha_reserva', 'fecha_expiracion',
            'fecha_pago', 'fecha_cancelacion', 'estado', 'observaciones'
        )
        convert_choices_to_enum = False


class TicketType(DjangoObjectType):
    class Meta:
        model  = Ticket
        fields = (
            'id_ticket', 'codigo_ticket', 'id_reserva', 'precio',
            'metodo_pago', 'id_transaccion', 'url_pasarela', 'qr_url',
            'monto_recibido', 'vuelto', 'detalle_efectivo',
            'fecha_emision', 'fecha_pago', 'estado'
        )
        convert_choices_to_enum = False


class Query(graphene.ObjectType):
    clientes           = graphene.List(ClienteType)
    cliente            = graphene.Field(ClienteType, id_cliente=graphene.Int(required=True))
    buscar_cliente     = graphene.Field(ClienteType, nro_documento=graphene.String(required=True))
    ventas             = graphene.List(VentaType)
    venta              = graphene.Field(VentaType, id_venta=graphene.Int(required=True))
    reservas           = graphene.List(ReservaType)
    reserva            = graphene.Field(ReservaType, id_reserva=graphene.Int(required=True))
    reservas_cliente   = graphene.List(ReservaType, id_cliente=graphene.Int(required=True))
    reservas_vuelo     = graphene.List(ReservaType, id_programacion=graphene.Int(required=True))
    reservas_venta     = graphene.List(ReservaType, id_venta=graphene.Int(required=True))
    tickets            = graphene.List(TicketType)
    ticket             = graphene.Field(TicketType, id_ticket=graphene.Int(required=True))
    ticket_por_reserva = graphene.Field(TicketType, id_reserva=graphene.Int(required=True))

    def resolve_clientes(root, info):
        return Cliente.objects.all()

    def resolve_cliente(root, info, id_cliente):
        try:
            return Cliente.objects.get(pk=id_cliente)
        except Cliente.DoesNotExist:
            return None

    def resolve_buscar_cliente(root, info, nro_documento):
        try:
            return Cliente.objects.get(nro_documento=nro_documento)
        except Cliente.DoesNotExist:
            return None

    def resolve_ventas(root, info):
        return Venta.objects.prefetch_related('reservas').all()

    def resolve_venta(root, info, id_venta):
        try:
            return Venta.objects.get(pk=id_venta)
        except Venta.DoesNotExist:
            return None

    def resolve_reservas(root, info):
        return Reserva.objects.select_related(
            'id_cliente', 'id_venta',
            'id_asiento_vuelo__id_programacion__id_ruta__id_aeropuerto_origen',
            'id_asiento_vuelo__id_programacion__id_ruta__id_aeropuerto_destino',
            'id_asiento_vuelo__id_asiento',
        ).all()

    def resolve_reserva(root, info, id_reserva):
        try:
            return Reserva.objects.get(pk=id_reserva)
        except Reserva.DoesNotExist:
            return None

    def resolve_reservas_cliente(root, info, id_cliente):
        return Reserva.objects.filter(id_cliente__id_cliente=id_cliente)

    def resolve_reservas_vuelo(root, info, id_programacion):
        return Reserva.objects.filter(
            id_asiento_vuelo__id_programacion__id_programacion=id_programacion
        ).select_related('id_cliente', 'id_asiento_vuelo__id_asiento')

    def resolve_reservas_venta(root, info, id_venta):
        return Reserva.objects.filter(id_venta__id_venta=id_venta)

    def resolve_tickets(root, info):
        return Ticket.objects.select_related(
            'id_reserva__id_cliente',
            'id_reserva__id_asiento_vuelo__id_programacion',
            'id_reserva__id_asiento_vuelo__id_asiento',
        ).all()

    def resolve_ticket(root, info, id_ticket):
        try:
            return Ticket.objects.get(pk=id_ticket)
        except Ticket.DoesNotExist:
            return None

    def resolve_ticket_por_reserva(root, info, id_reserva):
        try:
            return Ticket.objects.get(id_reserva__id_reserva=id_reserva)
        except Ticket.DoesNotExist:
            return None