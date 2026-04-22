from django.db import models

class Aeropuerto(models.Model):
    nombre = models.CharField(max_length=200)
    codigo = models.CharField(max_length=10, unique=True)
    ciudad = models.CharField(max_length=100)
    tipo = models.CharField(max_length=50, blank=True, default='')

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    class Meta:
        db_table = 'aeropuerto'