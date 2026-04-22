from django.db import models
from .usuario import Usuario

class Pasajero(models.Model):
    nombre = models.CharField(max_length=100)
    apellido_paterno = models.CharField(max_length=100)
    apellido_materno = models.CharField(max_length=100, blank=True, default='')
    correo_electronico = models.EmailField(unique=True)
    num_telefono = models.CharField(max_length=20, blank=True, default='')
    nacionalidad = models.CharField(max_length=100, blank=True, default='')
    tipo_documento = models.IntegerField(default=1)
    nro_documento = models.CharField(max_length=20, unique=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='pasajero'
    )

    def __str__(self):
        return f"{self.nombre} {self.apellido_paterno}"

    class Meta:
        db_table = 'pasajero'