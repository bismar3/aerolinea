from django.db import models
from .programacion_vuelo import ProgramacionVuelo


class Itinerario(models.Model):
    TIPO_CHOICES = [
        ('directo',    'Directo'),
        ('con_escala', 'Con Escala'),
    ]

    id_itinerario  = models.AutoField(primary_key=True)
    id_programacion = models.ForeignKey(
                          ProgramacionVuelo,
                          on_delete=models.CASCADE,
                          db_column='id_programacion',
                          related_name='itinerarios'
                      )
    fecha_salida   = models.DateField()
    fecha_llegada  = models.DateField()
    duracion_total = models.IntegerField(default=0)  # minutos
    tipo           = models.CharField(max_length=20, choices=TIPO_CHOICES, default='directo')
    estado         = models.CharField(max_length=20, default='activo')
    observaciones  = models.TextField(blank=True, null=True)

    class Meta:
        db_table    = 'itinerario'
        verbose_name = 'Itinerario'
        ordering    = ['fecha_salida']

    def __str__(self):
        return f"Itinerario {self.id_itinerario} - {self.id_programacion.codigo_vuelo}"