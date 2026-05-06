from django.db import models
from .grupo_tripulacion import GrupoTripulacion
from .programacion_vuelo import ProgramacionVuelo


class AsignacionGrupo(models.Model):
    ESTADO_CHOICES = [
        ('activo',     'Activo'),
        ('completado', 'Completado'),
        ('cancelado',  'Cancelado'),
    ]

    id_asignacion    = models.AutoField(primary_key=True)
    id_grupo         = models.ForeignKey(
                           GrupoTripulacion,
                           on_delete=models.CASCADE,
                           db_column='id_grupo',
                           related_name='asignaciones'
                       )
    id_programacion  = models.OneToOneField(
                           ProgramacionVuelo,
                           on_delete=models.CASCADE,
                           db_column='id_programacion',
                           related_name='asignacion_grupo'
                       )
    estado           = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo')
    fecha_asignacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table     = 'asignacion_grupo'
        verbose_name = 'Asignación de Grupo'
        ordering     = ['-fecha_asignacion']

    def __str__(self):
        return f"{self.id_grupo.nombre} → {self.id_programacion.codigo_vuelo}"