from django.db import models


class Rol(models.Model):
    id_rol      = models.AutoField(primary_key=True)
    nombre      = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    estado      = models.CharField(max_length=20, default='activo')

    class Meta:
        db_table            = 'rol'
        verbose_name        = 'Rol'
        verbose_name_plural = 'Roles'
        ordering            = ['nombre']

    def __str__(self):
        return self.nombre