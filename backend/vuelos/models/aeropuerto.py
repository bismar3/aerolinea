from django.db import models


class Aeropuerto(models.Model):
    id_aeropuerto = models.AutoField(primary_key=True)
    nombre        = models.CharField(max_length=150)
    ciudad        = models.CharField(max_length=100)
    codigo        = models.CharField(max_length=10, unique=True)
    tipo          = models.CharField(max_length=20, default='nacional')
    estado        = models.CharField(max_length=20, default='activo')
    latitud       = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitud      = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        db_table            = 'aeropuerto'
        verbose_name        = 'Aeropuerto'
        verbose_name_plural = 'Aeropuertos'
        ordering            = ['ciudad']

    def __str__(self):
        return f"{self.nombre} ({self.codigo}) - {self.ciudad}"