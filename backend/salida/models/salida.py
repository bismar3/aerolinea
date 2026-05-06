from django.db import models
from vuelos.models import ProgramacionVuelo


class Salida(models.Model):
    ESTADO_CHOICES = [
        ('programada',  'Programada'),
        ('abordando',   'En proceso de abordaje'),
        ('cerrada',     'Cerrada — vuelo en ruta'),
        ('cancelada',   'Cancelada'),
        ('reprogramada','Reprogramada'),
    ]

    MOTIVO_CANCELACION_CHOICES = [
        ('meteorologia',  'Condiciones meteorológicas'),
        ('falta_cupos',   'Falta de cupos mínimos'),
        ('administracion','Decisión administrativa BOA'),
    ]

    id_salida           = models.AutoField(primary_key=True)
    id_programacion     = models.OneToOneField(
                              ProgramacionVuelo,
                              on_delete=models.CASCADE,
                              db_column='id_programacion',
                              related_name='salida'
                          )
    estado              = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='programada')
    fecha_salida_real   = models.DateField(null=True, blank=True)
    hora_salida_real    = models.TimeField(null=True, blank=True)
    motivo_cancelacion  = models.CharField(max_length=20, choices=MOTIVO_CANCELACION_CHOICES, null=True, blank=True)
    observaciones       = models.TextField(blank=True, null=True)
    fecha_creacion      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table    = 'salida'
        verbose_name = 'Salida'
        ordering    = ['-fecha_creacion']
        

    def __str__(self):
        return f"Salida {self.id_programacion.codigo_vuelo} — {self.estado}"

    def porcentaje_ocupacion(self):
        prog  = self.id_programacion
        total = prog.asientos_disponible
        if total == 0:
            return 0
        return round((prog.asiento_vendido / total) * 100, 1)

    def cumple_minimo(self):
        return self.porcentaje_ocupacion() >= self.id_programacion.ocupacion_minima