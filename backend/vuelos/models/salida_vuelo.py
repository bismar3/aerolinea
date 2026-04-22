from django.db import models
from .programacion_vuelo import ProgramacionVuelo

class SalidaVuelo(models.Model):
    cupo_actual = models.IntegerField(default=0)
    cupo_minimo = models.IntegerField(default=0)
    estado = models.CharField(max_length=20, default='pendiente')
    fecha_confirmacion = models.DateTimeField(null=True, blank=True)
    observaciones = models.CharField(max_length=500, blank=True, default='')
    id_programacion = models.OneToOneField(ProgramacionVuelo, on_delete=models.CASCADE, related_name='salida')

    def __str__(self):
        return f"Salida vuelo {self.id_programacion.codigo_vuelo}"

    class Meta:
        db_table = 'salida_vuelo'