from django.db import models
from .reserva import Reserva
import uuid


class Ticket(models.Model):
    METODO_PAGO_CHOICES = [
        ('qr_caja',   'QR Libélula — Caja'),
        ('qr_online', 'QR Libélula — Online'),
        ('efectivo',  'Efectivo'),
        ('tarjeta',   'Tarjeta'),
    ]
    ESTADO_CHOICES = [
        ('emitido', 'Emitido — pendiente de pago QR'),
        ('pagado',  'Pagado'),
        ('anulado', 'Anulado'),
        ('usado',   'Usado'),
    ]

    id_ticket        = models.AutoField(primary_key=True)
    codigo_ticket    = models.CharField(max_length=20, unique=True, editable=False)
    id_reserva       = models.OneToOneField(
                           Reserva, on_delete=models.CASCADE,
                           db_column='id_reserva', related_name='ticket'
                       )
    precio           = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago      = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES, default='qr_caja')
    id_transaccion   = models.CharField(max_length=100, blank=True, null=True)
    url_pasarela     = models.TextField(blank=True, null=True)
    qr_url           = models.TextField(blank=True, null=True)
    # Efectivo
    monto_recibido   = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    vuelto           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    detalle_efectivo = models.JSONField(null=True, blank=True)
    # Fechas
    fecha_emision    = models.DateTimeField(auto_now_add=True)
    fecha_pago       = models.DateTimeField(null=True, blank=True)
    # Estado: emitido = QR generado sin pagar | pagado = confirmado
    estado           = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='emitido')

    class Meta:
        db_table            = 'ticket'
        verbose_name        = 'Ticket'
        verbose_name_plural = 'Tickets'
        ordering            = ['-fecha_emision']

    def save(self, *args, **kwargs):
        if not self.codigo_ticket:
            self.codigo_ticket = f"TKT-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.codigo_ticket} - {self.id_reserva.id_cliente.get_nombre_completo()}"