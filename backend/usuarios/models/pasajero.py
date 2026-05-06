from django.db import models
from .usuario import Usuario


class Pasajero(models.Model):
    id_pasajero      = models.AutoField(primary_key=True)
    nombre           = models.CharField(max_length=100)
    apellido_paterno = models.CharField(max_length=100)
    apellido_materno = models.CharField(max_length=100, blank=True, default='')
    correo           = models.EmailField(unique=True)
    num_telefono     = models.CharField(max_length=20, blank=True, default='')
    nacionalidad     = models.CharField(max_length=100, blank=True, default='')
    tipo_documento   = models.IntegerField(default=1)
    nro_documento    = models.CharField(max_length=20, unique=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    id_usuario       = models.OneToOneField(
                           Usuario,
                           on_delete=models.CASCADE,
                           null=True, blank=True,
                           db_column='id_usuario',
                           related_name='pasajero'
                       )

    class Meta:
        db_table            = 'pasajero'
        verbose_name        = 'Pasajero'
        verbose_name_plural = 'Pasajeros'

    def __str__(self):
        return f"{self.nombre} {self.apellido_paterno}"

    def get_nombre_completo(self):
        return f"{self.nombre} {self.apellido_paterno} {self.apellido_materno}".strip()