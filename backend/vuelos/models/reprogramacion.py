from django.db import models
from .programacion_vuelo import ProgramacionVuelo


class Reprogramacion(models.Model):
    MOTIVO_CHOICES = [
        ('meteorologia',  'Condiciones Meteorológicas'),
        ('falta_cupos',   'Falta de Ocupación Mínima'),
        ('administrativo', 'Decisión Administrativa'),
        ('falla_tecnica', 'Falla Técnica'),
        ('otro',          'Otro Motivo'),
    ]
    ESTADO_CHOICES = [
        ('pendiente',     'Pendiente'),
        ('reprogramado',  'Reprogramado'),
        ('cancelado_definitivo', 'Cancelado Definitivo'),
    ]

    id_reprogramacion  = models.AutoField(primary_key=True)
    id_programacion    = models.ForeignKey(
                             ProgramacionVuelo,
                             on_delete=models.CASCADE,
                             db_column='id_programacion',
                             related_name='reprogramaciones'
                         )
    motivo             = models.CharField(max_length=30, choices=MOTIVO_CHOICES)
    descripcion        = models.TextField(blank=True, null=True)
    estado             = models.CharField(max_length=30, choices=ESTADO_CHOICES, default='pendiente')
    # Nueva fecha/hora propuesta
    nueva_fecha_salida = models.DateField(null=True, blank=True)
    nueva_hora_salida  = models.TimeField(null=True, blank=True)
    # Auditoría
    fecha_creacion     = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table     = 'reprogramacion'
        verbose_name = 'Reprogramación'
        ordering     = ['-fecha_creacion']

    def __str__(self):
        return f"Reprogramación {self.id_programacion.codigo_vuelo} — {self.motivo}"