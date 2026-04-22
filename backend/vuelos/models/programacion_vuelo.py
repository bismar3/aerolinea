from django.db import models
from .ruta import Ruta
from .aeronave import Aeronave
from .itinerario import Itinerario
from .escala import Escala

class ProgramacionVuelo(models.Model):
    codigo_vuelo = models.CharField(max_length=20, unique=True)
    fecha_salida = models.DateTimeField()
    fecha_llegada = models.DateTimeField()
    hora_salida = models.TimeField()
    hora_llegada = models.TimeField()
    asientos_disponible = models.IntegerField(default=0)
    asiento_vendido = models.IntegerField(default=0)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)
    estado = models.CharField(max_length=20, default='programado')
    id_ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE, related_name='programaciones')
    id_aeronave = models.ForeignKey(Aeronave, on_delete=models.CASCADE, related_name='programaciones')
    id_itinerario = models.ForeignKey(Itinerario, on_delete=models.CASCADE, related_name='programaciones')
    id_escala = models.ForeignKey(Escala, on_delete=models.SET_NULL, null=True, blank=True, related_name='programaciones')

    def __str__(self):
        return f"Vuelo {self.codigo_vuelo}"

    class Meta:
        db_table = 'programacion_vuelo'