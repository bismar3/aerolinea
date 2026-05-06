from django.db import models
from .ruta import Ruta
from .aeropuerto import Aeropuerto


class Escala(models.Model):
    id_escala        = models.AutoField(primary_key=True)
    id_ruta          = models.ForeignKey(
                           Ruta,
                           on_delete=models.CASCADE,
                           db_column='id_ruta',
                           related_name='escalas'
                       )
    aeropuerto       = models.ForeignKey(
                           Aeropuerto,
                           on_delete=models.CASCADE,
                           db_column='id_aeropuerto',
                           related_name='escalas'
                       )
    ciudad           = models.CharField(max_length=100)
    orden            = models.IntegerField()  # orden de la escala en la ruta
    tiempo_duracion  = models.IntegerField(default=0)  # minutos de escala

    class Meta:
        db_table        = 'escala'
        verbose_name    = 'Escala'
        unique_together = ('id_ruta', 'orden')
        ordering        = ['id_ruta', 'orden']

    def __str__(self):
        return f"Escala {self.orden} - {self.ciudad} (Ruta {self.id_ruta})"