from django.db import models
from .aeronave import Aeronave

class Asiento(models.Model):
    numero = models.CharField(max_length=10)
    fila = models.CharField(max_length=5)
    clase = models.CharField(max_length=50)
    estado = models.CharField(max_length=20, default='disponible')
    id_aeronave = models.ForeignKey(Aeronave, on_delete=models.CASCADE, related_name='asientos')

    def __str__(self):
        return f"{self.numero} - {self.clase}"

    class Meta:
        db_table = 'asiento'