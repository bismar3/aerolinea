from django.db import models
from .aeronave import Aeronave


class Asiento(models.Model):
    CLASE_CHOICES = [
        ('economica',         'Económica'),
        ('economica_premium', 'Económica Premium'),
        ('ejecutiva',         'Ejecutiva'),
        ('primera_clase',     'Primera Clase'),
    ]

    id_asiento  = models.AutoField(primary_key=True)
    id_aeronave = models.ForeignKey(
                      Aeronave,
                      on_delete=models.CASCADE,
                      db_column='id_aeronave',
                      related_name='asientos'
                  )
    numero      = models.CharField(max_length=5)   # ej: 1A, 12C
    fila        = models.IntegerField()
    clase       = models.CharField(max_length=20, choices=CLASE_CHOICES, default='economica')
    estado      = models.CharField(max_length=20, default='activo')

    class Meta:
        db_table        = 'asiento'
        verbose_name    = 'Asiento'
        unique_together = ('id_aeronave', 'numero')
        ordering        = ['fila', 'numero']

    def __str__(self):
        return f"{self.numero} ({self.clase}) - {self.id_aeronave.codigo_aeronave}"