from django.db import models
from .usuario import Usuario
from .rol_permiso import RolPermiso

class RolPermisoUsuario(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    rol_permiso = models.ForeignKey(RolPermiso, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.usuario.user_name} - {self.rol_permiso}"

    class Meta:
        db_table = 'rol_permiso_usuario'