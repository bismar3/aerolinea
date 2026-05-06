from django.db import models
from .usuario import Usuario
from .permiso import Permiso


class RolPermisoUsuario(models.Model):
    id_rol_permiso_usuario = models.AutoField(primary_key=True)
    id_usuario             = models.ForeignKey(
                                 Usuario,
                                 on_delete=models.CASCADE,
                                 db_column='id_usuario',
                                 related_name='permisos_usuario'
                             )
    id_permiso             = models.ForeignKey(
                                 Permiso,
                                 on_delete=models.CASCADE,
                                 db_column='id_permiso',
                                 related_name='usuarios_permiso'
                             )

    class Meta:
        db_table            = 'rol_permiso_usuario'
        unique_together     = ('id_usuario', 'id_permiso')
        verbose_name        = 'Permiso de Usuario'
        verbose_name_plural = 'Permisos de Usuarios'

    def __str__(self):
        return f"{self.id_usuario.username} -> {self.id_permiso.nombre}"