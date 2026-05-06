from django.db import models


class Permiso(models.Model):
    id_permiso  = models.AutoField(primary_key=True)
    nombre      = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    estado      = models.CharField(max_length=20, default='activo')

    class Meta:
        db_table            = 'permiso'
        verbose_name        = 'Permiso'
        verbose_name_plural = 'Permisos'
        ordering            = ['nombre']

    def __str__(self):
        return self.nombre