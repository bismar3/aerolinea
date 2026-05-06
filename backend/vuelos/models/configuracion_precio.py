from django.db import models


class ConfiguracionPrecio(models.Model):
    id_config                    = models.AutoField(primary_key=True)
    incremento_economica_premium = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    incremento_ejecutiva         = models.DecimalField(max_digits=5, decimal_places=2, default=15.00)
    incremento_primera_clase     = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    activo                       = models.BooleanField(default=True)

    class Meta:
        db_table    = 'configuracion_precio'
        verbose_name = 'Configuracion de Precio'

    def __str__(self):
        return f"Config precios: +{self.incremento_economica_premium}% / +{self.incremento_ejecutiva}% / +{self.incremento_primera_clase}%"

    @classmethod
    def get_activa(cls):
        return cls.objects.filter(activo=True).first()