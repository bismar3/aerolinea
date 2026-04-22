from django.db import models
from .aeropuerto import Aeropuerto

class Ruta(models.Model):
    distancia_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    duracion_hr = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    estado = models.CharField(max_length=20, default='activa')
    tipo = models.CharField(max_length=50, blank=True, default='')
    id_aeropuerto_origen = models.ForeignKey(
        Aeropuerto, on_delete=models.CASCADE,
        related_name='rutas_origen'
    )
    id_aeropuerto_destino = models.ForeignKey(
        Aeropuerto, on_delete=models.CASCADE,
        related_name='rutas_destino'
    )

    def __str__(self):
        return f"{self.id_aeropuerto_origen} → {self.id_aeropuerto_destino}"

    class Meta:
        db_table = 'ruta'