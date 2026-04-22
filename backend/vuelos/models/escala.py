from django.db import models
from .ruta import Ruta
from .aeropuerto import Aeropuerto

class Escala(models.Model):
    ciudad = models.CharField(max_length=100, blank=True, default='')
    orden = models.IntegerField()
    tiempo_duracion = models.IntegerField(null=True, blank=True)
    id_ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE, related_name='escalas')
    id_aeropuerto = models.ForeignKey(Aeropuerto, on_delete=models.CASCADE)
    id_escala_anterior = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='escalas_siguientes'
    )

    def __str__(self):
        return f"Escala {self.orden} - {self.ciudad}"

    class Meta:
        db_table = 'escala'