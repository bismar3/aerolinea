from django.db import models

class Aeronave(models.Model):
    codigo_aeronave = models.CharField(max_length=20, unique=True)
    modelo = models.CharField(max_length=100)
    capacidad_ejecutiva = models.IntegerField(default=0)
    capacidad_turista = models.IntegerField(default=0)
    estado = models.CharField(max_length=20, default='activa')

    def __str__(self):
        return f"{self.codigo_aeronave} - {self.modelo}"

    class Meta:
        db_table = 'aeronave'