from django.db import models
from .programacion_vuelo import ProgramacionVuelo
from seguridad.models import Usuario

class Tripulacion(models.Model):
    fecha_asignacion = models.DateField()
    observaciones = models.CharField(max_length=500, blank=True, default='')
    id_programacion = models.ForeignKey(ProgramacionVuelo, on_delete=models.CASCADE, related_name='tripulacion')
    id_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='tripulaciones')

    def __str__(self):
        return f"Tripulacion vuelo {self.id_programacion.codigo_vuelo}"

    class Meta:
        db_table = 'tripulacion'