from django.db import models
from .salida import Salida
from reservas.models import Reserva


class DetalleAbordaje(models.Model):
    id_detalle    = models.AutoField(primary_key=True)
    id_salida     = models.ForeignKey(
                        Salida,
                        on_delete=models.CASCADE,
                        db_column='id_salida',
                        related_name='detalles_abordaje'
                    )
    id_reserva    = models.ForeignKey(
                        Reserva,
                        on_delete=models.CASCADE,
                        db_column='id_reserva',
                        related_name='detalle_abordaje'
                    )
    abordado      = models.BooleanField(default=False)
    hora_abordaje = models.TimeField(null=True, blank=True)

    class Meta:
        db_table        = 'detalle_abordaje'
        unique_together = ('id_salida', 'id_reserva')
        verbose_name    = 'Detalle de Abordaje'

    def __str__(self):
        estado = 'Abordó' if self.abordado else 'No se presentó'
        return f"{self.id_reserva.id_cliente.get_nombre_completo()} — {estado}"