from django.db import models
from decimal import Decimal
import uuid


class Venta(models.Model):
    METODO_PAGO_CHOICES = [
        ('efectivo',  'Efectivo'),
        ('qr_caja',   'QR Libélula — Caja'),
        ('qr_online', 'QR Libélula — Online'),
    ]
    ESTADO_CHOICES = [
        ('pendiente',  'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('cancelada',  'Cancelada'),
    ]
    CANAL_CHOICES = [
        ('caja',   'Caja / Agente'),
        ('online', 'Plataforma Web'),
    ]

    id_venta         = models.AutoField(primary_key=True)
    codigo_venta     = models.CharField(max_length=20, unique=True, editable=False)
    canal            = models.CharField(max_length=10, choices=CANAL_CHOICES, default='caja')
    metodo_pago      = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES, null=True, blank=True)
    total            = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    estado           = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    # Efectivo
    monto_recibido   = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    vuelto           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    detalle_efectivo = models.JSONField(null=True, blank=True)
    # Fechas
    fecha_creacion    = models.DateTimeField(auto_now_add=True)
    fecha_pago        = models.DateTimeField(null=True, blank=True)
    fecha_cancelacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table     = 'venta'
        verbose_name = 'Venta'
        ordering     = ['-fecha_creacion']

    def save(self, *args, **kwargs):
        if not self.codigo_venta:
            self.codigo_venta = f"VTA-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.codigo_venta} — Bs. {self.total}"

    def calcular_total(self):
        total = sum(
            r.ticket.precio
            for r in self.reservas.all()
            if hasattr(r, 'ticket')
        )
        self.total = total
        self.save()
        return total