from django.db import models


class Aeronave(models.Model):
    PASILLO_CHOICES = [
        ('simple', 'Un pasillo'),
        ('doble',  'Dos pasillos'),
    ]

    id_aeronave             = models.AutoField(primary_key=True)
    codigo_aeronave         = models.CharField(max_length=20, unique=True)
    modelo                  = models.CharField(max_length=100)
    tipo_pasillo            = models.CharField(max_length=10, choices=PASILLO_CHOICES, default='simple')
    asientos_economica      = models.IntegerField(default=0)
    asientos_economica_premium = models.IntegerField(default=0)
    asientos_ejecutiva      = models.IntegerField(default=0)
    asientos_primera_clase  = models.IntegerField(default=0)
    estado                  = models.CharField(max_length=20, default='activo')

    class Meta:
        db_table            = 'aeronave'
        verbose_name        = 'Aeronave'
        verbose_name_plural = 'Aeronaves'
        ordering            = ['modelo']

    def __str__(self):
        return f"{self.codigo_aeronave} - {self.modelo}"

    def total_asientos(self):
        return (
            self.asientos_primera_clase +
            self.asientos_ejecutiva +
            self.asientos_economica_premium +
            self.asientos_economica
        )

    def letras_por_fila(self):
        if self.tipo_pasillo == 'doble':
            return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K']
        return ['A', 'B', 'C', 'D', 'E', 'F']