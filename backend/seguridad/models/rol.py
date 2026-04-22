from django.db import models

class Rol(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=200, blank=True, default='')

    def __str__(self):
        return self.nombre

    class Meta:
        db_table = 'rol'