from django.db import models
from django.contrib.auth.hashers import make_password, check_password

class Usuario(models.Model):
    TIPO_CHOICES = [
        ('trabajador', 'Trabajador'),
        ('pasajero', 'Pasajero'),
    ]
    user_name = models.CharField(max_length=100, unique=True)
    correo_electronico = models.EmailField(unique=True)
    contrasena = models.CharField(max_length=255)
    estado = models.CharField(max_length=20, default='activo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    intentos_fallidos = models.IntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)
    tipo_usuario = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='trabajador'
    )

    def set_password(self, raw_password):
        self.contrasena = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.contrasena)

    def __str__(self):
        return self.user_name

    class Meta:
        db_table = 'usuario'