from django.db import models


class Cliente(models.Model):
    DOCUMENTO_CHOICES = [
        ('ci',        'Cedula de Identidad'),
        ('pasaporte', 'Pasaporte'),
        ('otro',      'Otro'),
    ]

    id_cliente       = models.AutoField(primary_key=True)
    nombre           = models.CharField(max_length=100)
    apellido_paterno = models.CharField(max_length=100)
    apellido_materno = models.CharField(max_length=100, blank=True, default='')
    tipo_documento   = models.CharField(max_length=20, choices=DOCUMENTO_CHOICES, default='ci')
    nro_documento    = models.CharField(max_length=30, unique=True)
    correo           = models.EmailField(max_length=150, blank=True, null=True)
    telefono         = models.CharField(max_length=20, blank=True, null=True)
    nacionalidad     = models.CharField(max_length=100, blank=True, default='boliviana')
    fecha_nacimiento = models.DateField(null=True, blank=True)

    class Meta:
        db_table            = 'cliente'
        verbose_name        = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering            = ['apellido_paterno', 'nombre']

    def __str__(self):
        return f"{self.nombre} {self.apellido_paterno} ({self.tipo_documento}: {self.nro_documento})"

    def get_nombre_completo(self):
        return f"{self.nombre} {self.apellido_paterno} {self.apellido_materno}".strip()