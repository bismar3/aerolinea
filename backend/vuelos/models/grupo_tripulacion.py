from django.db import models
from .tripulante import Tripulante


class GrupoTripulacion(models.Model):
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('asignado',   'Asignado'),
        ('en_vuelo',   'En Vuelo'),
    ]

    id_grupo    = models.AutoField(primary_key=True)
    nombre      = models.CharField(max_length=100, unique=True)
    tripulantes = models.ManyToManyField(
                      Tripulante,
                      related_name='grupos',
                      blank=True
                  )
    estado      = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='disponible')

    class Meta:
        db_table     = 'grupo_tripulacion'
        verbose_name = 'Grupo de Tripulación'
        ordering     = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.estado})"