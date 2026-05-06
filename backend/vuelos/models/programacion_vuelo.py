from django.db import models
from .ruta import Ruta
from .aeronave import Aeronave


class ProgramacionVuelo(models.Model):
    ESTADO_CHOICES = [
        ('programado',   'Programado'),
        ('en_vuelo',     'En Vuelo'),
        ('aterrizado',   'Aterrizado'),
        ('cancelado',    'Cancelado'),
        ('retrasado',    'Retrasado'),
        ('reprogramado', 'Reprogramado'),
    ]
    MOTIVO_CHOICES = [
        ('meteorologia',   'Condiciones Meteorológicas'),
        ('falta_cupos',    'Falta de Ocupación Mínima'),
        ('administrativo', 'Decisión Administrativa'),
        ('falla_tecnica',  'Falla Técnica'),
        ('otro',           'Otro Motivo'),
    ]

    id_programacion         = models.AutoField(primary_key=True)
    codigo_vuelo            = models.CharField(max_length=20, unique=True)
    id_ruta                 = models.ForeignKey(
                                  Ruta, on_delete=models.CASCADE,
                                  db_column='id_ruta', related_name='programaciones'
                              )
    id_aeronave             = models.ForeignKey(
                                  Aeronave, on_delete=models.CASCADE,
                                  db_column='id_aeronave', related_name='programaciones'
                              )
    fecha_salida            = models.DateField()
    hora_salida             = models.TimeField()
    fecha_llegada           = models.DateField()
    hora_llegada            = models.TimeField()
    asientos_disponible     = models.IntegerField(default=0)
    asiento_vendido         = models.IntegerField(default=0)
    precio_base             = models.DecimalField(max_digits=10, decimal_places=2)
    ocupacion_minima        = models.IntegerField(default=75)
    estado                  = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='programado')
    motivo_cancelacion      = models.CharField(max_length=30, choices=MOTIVO_CHOICES, null=True, blank=True)
    descripcion_cancelacion = models.TextField(null=True, blank=True)

    class Meta:
        db_table     = 'programacion_vuelo'
        verbose_name = 'Programacion de Vuelo'
        ordering     = ['fecha_salida', 'hora_salida']

    def __str__(self):
        return f"{self.codigo_vuelo} - {self.id_ruta} ({self.fecha_salida})"

    def porcentaje_ocupacion(self):
        if self.asientos_disponible == 0:
            return 0
        return round((self.asiento_vendido / self.asientos_disponible) * 100, 1)

    def cumple_minimo(self):
        return self.porcentaje_ocupacion() >= self.ocupacion_minima