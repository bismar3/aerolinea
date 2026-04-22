from django.db import models
from .rol import Rol
from .permiso import Permiso

class RolPermiso(models.Model):
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE)
    permiso = models.ForeignKey(Permiso, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.rol.nombre} - {self.permiso.nombre}"

    class Meta:
        db_table = 'rol_permiso'