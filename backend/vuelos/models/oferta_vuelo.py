from django.db import models
from .programacion_vuelo import ProgramacionVuelo


class OfertaVuelo(models.Model):
    CLASE_CHOICES = [
        ('economica',         'Economica'),
        ('economica_premium', 'Economica Premium'),
        ('ejecutiva',         'Ejecutiva'),
        ('primera_clase',     'Primera Clase'),
    ]

    id_oferta            = models.AutoField(primary_key=True)
    id_programacion      = models.ForeignKey(
                               ProgramacionVuelo,
                               on_delete=models.CASCADE,
                               db_column='id_programacion',
                               related_name='ofertas'
                           )
    clase                = models.CharField(max_length=20, choices=CLASE_CHOICES)
    porcentaje_descuento = models.DecimalField(max_digits=5, decimal_places=2)
    fecha_inicio         = models.DateField()
    fecha_fin            = models.DateField()
    activo               = models.BooleanField(default=True)

    class Meta:
        db_table    = 'oferta_vuelo'
        verbose_name = 'Oferta de Vuelo'

    def __str__(self):
        return f"{self.id_programacion.codigo_vuelo} - {self.clase} -{self.porcentaje_descuento}%"