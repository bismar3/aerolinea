from django.db import models
from reservas.models import Ticket


class Ingreso(models.Model):
    TIPO_CHOICES = [
        ('venta_pasaje', 'Venta de pasaje'),
        ('otro',         'Otro ingreso'),
    ]

    id_ingreso  = models.AutoField(primary_key=True)
    id_ticket   = models.OneToOneField(
                      Ticket,
                      on_delete=models.SET_NULL,  # ← SET_NULL para preservar el ingreso si el ticket se anula
                      db_column='id_ticket',
                      related_name='ingreso',
                      null=True, blank=True
                  )
    concepto    = models.CharField(max_length=200)
    tipo        = models.CharField(max_length=20, choices=TIPO_CHOICES, default='venta_pasaje')
    monto       = models.DecimalField(max_digits=10, decimal_places=2)
    fecha       = models.DateTimeField(auto_now_add=True)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        db_table     = 'ingreso'
        verbose_name = 'Ingreso'
        ordering     = ['-fecha']

    def __str__(self):
        return f"Ingreso Bs. {self.monto} — {self.concepto}"