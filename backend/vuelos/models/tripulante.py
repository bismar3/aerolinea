from django.db import models


class Tripulante(models.Model):
    CARGO_CHOICES = [
        ('piloto',    'Piloto'),
        ('copiloto',  'Copiloto'),
        ('auxiliar',  'Auxiliar de Vuelo'),
    ]
    ESTADO_CHOICES = [
        ('libre',             'Libre'),
        ('asignado',          'Asignado'),
        ('en_vuelo',          'En Vuelo'),
        ('fuera_de_servicio', 'Fuera de Servicio'),
    ]

    id_tripulante = models.AutoField(primary_key=True)
    nombre        = models.CharField(max_length=100)
    apellido      = models.CharField(max_length=100)
    ci            = models.CharField(max_length=20, unique=True)
    cargo         = models.CharField(max_length=20, choices=CARGO_CHOICES)
    estado        = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='libre')

    class Meta:
        db_table     = 'tripulante'
        verbose_name = 'Tripulante'
        ordering     = ['apellido', 'nombre']

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.cargo})"