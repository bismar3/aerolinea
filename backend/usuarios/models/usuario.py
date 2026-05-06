from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from .rol import Rol


class PoliticaContrasena(models.Model):
    id_politica        = models.AutoField(primary_key=True)
    longitud_minima    = models.SmallIntegerField(default=8)
    requiere_mayuscula = models.BooleanField(default=True)
    requiere_numero    = models.BooleanField(default=True)
    requiere_especial  = models.BooleanField(default=False)
    max_intentos       = models.SmallIntegerField(default=3)
    minutos_bloqueo    = models.SmallIntegerField(default=15)
    activo             = models.BooleanField(default=True)

    class Meta:
        db_table            = 'politica_contrasena'
        verbose_name        = 'Politica de contrasena'
        verbose_name_plural = 'Politicas de contrasena'

    def __str__(self):
        return f"Politica min. {self.longitud_minima} chars, {self.max_intentos} intentos"


class Usuario(models.Model):
    TIPO_CHOICES = [
        ('trabajador', 'Trabajador'),
        ('pasajero',   'Pasajero'),
    ]

    id_usuario        = models.AutoField(primary_key=True)
    nombre            = models.CharField(max_length=100)
    paterno           = models.CharField(max_length=100, blank=True, null=True)
    materno           = models.CharField(max_length=100, blank=True, null=True)
    telefono          = models.CharField(max_length=20, blank=True, null=True)
    correo            = models.EmailField(max_length=150, unique=True)
    username          = models.CharField(max_length=50, unique=True)
    password          = models.CharField(max_length=255)
    fecha_registro    = models.DateTimeField(auto_now_add=True)
    estado            = models.CharField(max_length=20, default='activo')
    tipo_usuario      = models.CharField(max_length=20, choices=TIPO_CHOICES, default='trabajador')

    intentos_fallidos = models.SmallIntegerField(default=0)
    bloqueado         = models.BooleanField(default=False)
    fecha_bloqueo     = models.DateTimeField(blank=True, null=True)

    id_rol            = models.ForeignKey(
                            Rol,
                            on_delete=models.SET_NULL,
                            null=True, blank=True,
                            db_column='id_rol',
                            related_name='usuarios'
                        )

    class Meta:
        db_table            = 'usuario'
        verbose_name        = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering            = ['paterno', 'nombre']

    def __str__(self):
        return f"{self.nombre} {self.paterno or ''} ({self.username})"

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def get_nombre_completo(self):
        return f"{self.nombre} {self.paterno or ''} {self.materno or ''}".strip()

    def esta_bloqueado(self):
        if not self.bloqueado:
            return False
        if self.fecha_bloqueo:
            from django.utils import timezone
            from datetime import timedelta
            politica = PoliticaContrasena.objects.filter(activo=True).first()
            minutos  = politica.minutos_bloqueo if politica else 15
            if timezone.now() > self.fecha_bloqueo + timedelta(minutes=minutos):
                self.bloqueado         = False
                self.intentos_fallidos = 0
                self.fecha_bloqueo     = None
                self.save()
                return False
        return True

    def registrar_intento_fallido(self):
        from django.utils import timezone
        politica     = PoliticaContrasena.objects.filter(activo=True).first()
        max_intentos = politica.max_intentos if politica else 3
        self.intentos_fallidos += 1
        if self.intentos_fallidos >= max_intentos:
            self.bloqueado     = True
            self.fecha_bloqueo = timezone.now()
        self.save()

    def resetear_intentos(self):
        self.intentos_fallidos = 0
        self.bloqueado         = False
        self.fecha_bloqueo     = None
        self.save()