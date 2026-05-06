from django.db import models
from .cliente import Cliente
from vuelos.models import AsientoVuelo
import uuid


class Reserva(models.Model):
    ESTADO_CHOICES = [
        ('pendiente',  'Pendiente de pago'),
        ('confirmada', 'Confirmada'),
        ('cancelada',  'Cancelada'),
        ('expirada',   'Expirada'),
    ]
    CANAL_CHOICES = [
        ('caja',   'Caja / Agente'),
        ('online', 'Plataforma Web'),
    ]

    id_reserva        = models.AutoField(primary_key=True)
    codigo_reserva    = models.CharField(max_length=20, unique=True, editable=False)
    id_cliente        = models.ForeignKey(
                            Cliente, on_delete=models.CASCADE,
                            db_column='id_cliente', related_name='reservas'
                        )
    id_asiento_vuelo  = models.OneToOneField(
                            AsientoVuelo, on_delete=models.CASCADE,
                            db_column='id_asiento_vuelo', related_name='reserva'
                        )
    id_venta          = models.ForeignKey(
                            'Venta', on_delete=models.SET_NULL,
                            null=True, blank=True,
                            db_column='id_venta', related_name='reservas'
                        )
    canal             = models.CharField(max_length=10, choices=CANAL_CHOICES, default='caja')
    fecha_reserva     = models.DateTimeField(auto_now_add=True)
    fecha_expiracion  = models.DateTimeField(null=True, blank=True)
    fecha_pago        = models.DateTimeField(null=True, blank=True)
    fecha_cancelacion = models.DateTimeField(null=True, blank=True)
    estado            = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    observaciones     = models.TextField(blank=True, null=True)

    class Meta:
        db_table            = 'reserva'
        verbose_name        = 'Reserva'
        verbose_name_plural = 'Reservas'
        ordering            = ['-fecha_reserva']

    def save(self, *args, **kwargs):
        if not self.codigo_reserva:
            self.codigo_reserva = f"RES-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.codigo_reserva} - {self.id_cliente.get_nombre_completo()}"