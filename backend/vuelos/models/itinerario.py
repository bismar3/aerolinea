from django.db import models
from .ruta import Ruta

class Itinerario(models.Model):
    fecha = models.DateField()
    fecha_salida = models.DateTimeField()
    fecha_llegada = models.DateTimeField()
    duracion_total = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    estado = models.CharField(max_length=20, default='programado')
    tipo = models.CharField(max_length=50, blank=True, default='')
    observaciones = models.CharField(max_length=500, blank=True, default='')
    id_ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE, related_name='itinerarios')

    def __str__(self):
        return f"Itinerario {self.id} - {self.fecha}"

    class Meta:
        db_table = 'itinerario'