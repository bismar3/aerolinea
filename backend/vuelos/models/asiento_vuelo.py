from django.db import models
from .programacion_vuelo import ProgramacionVuelo
from .asiento import Asiento


class AsientoVuelo(models.Model):
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('reservado',  'Reservado'),
        ('vendido',    'Vendido'),
        ('bloqueado',  'Bloqueado'),
    ]

    id_asiento_vuelo = models.AutoField(primary_key=True)
    id_programacion  = models.ForeignKey(
                           ProgramacionVuelo,
                           on_delete=models.CASCADE,
                           db_column='id_programacion',
                           related_name='asientos_vuelo'
                       )
    id_asiento       = models.ForeignKey(
                           Asiento,
                           on_delete=models.CASCADE,
                           db_column='id_asiento',
                           related_name='asientos_vuelo'
                       )
    estado           = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='disponible')

    class Meta:
        db_table        = 'asiento_vuelo'
        unique_together = ('id_programacion', 'id_asiento')
        verbose_name    = 'Asiento de Vuelo'

    def __str__(self):
        return f"{self.id_programacion.codigo_vuelo} - {self.id_asiento.numero} ({self.estado})"