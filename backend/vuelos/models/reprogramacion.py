from django.db import models
from .programacion_vuelo import ProgramacionVuelo

class Reprogramacion(models.Model):
    fecha_anterior = models.DateTimeField()
    fecha_nueva = models.DateTimeField()
    hora_anterior = models.TimeField()
    hora_nueva = models.TimeField()
    motivo = models.CharField(max_length=500, blank=True, default='')
    estado = models.CharField(max_length=20, default='pendiente')
    id_programacion = models.OneToOneField(ProgramacionVuelo, on_delete=models.CASCADE, related_name='reprogramacion')

    def __str__(self):
        return f"Reprogramacion vuelo {self.id_programacion.codigo_vuelo}"

    class Meta:
        db_table = 'reprogramacion'