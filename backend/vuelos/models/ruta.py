from django.db import models
from .aeropuerto import Aeropuerto


class Ruta(models.Model):
    TIPO_CHOICES = [
        ('nacional',       'Nacional'),
        ('internacional',  'Internacional'),
    ]

    id_ruta               = models.AutoField(primary_key=True)
    id_aeropuerto_origen  = models.ForeignKey(
                                Aeropuerto,
                                on_delete=models.CASCADE,
                                db_column='id_aeropuerto_origen',
                                related_name='rutas_origen'
                            )
    id_aeropuerto_destino = models.ForeignKey(
                                Aeropuerto,
                                on_delete=models.CASCADE,
                                db_column='id_aeropuerto_destino',
                                related_name='rutas_destino'
                            )
    distancia_km          = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    duracion_hr           = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    tipo                  = models.CharField(max_length=20, choices=TIPO_CHOICES, default='nacional')
    estado                = models.CharField(max_length=20, default='activo')

    class Meta:
        db_table        = 'ruta'
        verbose_name    = 'Ruta'
        unique_together = ('id_aeropuerto_origen', 'id_aeropuerto_destino')
        ordering        = ['id_aeropuerto_origen__ciudad']

    def __str__(self):
        return f"{self.id_aeropuerto_origen.ciudad} → {self.id_aeropuerto_destino.ciudad}"