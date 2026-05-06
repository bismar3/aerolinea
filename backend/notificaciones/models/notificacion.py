from django.db import models


class Notificacion(models.Model):
    TIPO_CHOICES = [
        ('reprogramacion',    'Reprogramación de vuelo'),
        ('cancelacion',       'Cancelación de vuelo'),
        ('confirmacion_pago', 'Confirmación de pago'),
        ('devolucion',        'Devolución procesada'),
        ('abordaje',          'Recordatorio de abordaje'),
        ('general',           'General'),
    ]

    id_notificacion  = models.AutoField(primary_key=True)
    titulo           = models.CharField(max_length=200)
    mensaje          = models.TextField()
    tipo             = models.CharField(max_length=30, choices=TIPO_CHOICES, default='general')
    # A quién va dirigida — puede ser un usuario del sistema o un cliente
    id_usuario       = models.IntegerField(null=True, blank=True)   # FK lógica a Usuario
    id_cliente       = models.IntegerField(null=True, blank=True)   # FK lógica a Cliente
    leida            = models.BooleanField(default=False)
    fecha_creacion   = models.DateTimeField(auto_now_add=True)
    fecha_lectura    = models.DateTimeField(null=True, blank=True)
    # Referencia opcional al objeto relacionado
    referencia_id    = models.IntegerField(null=True, blank=True)
    referencia_tipo  = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table    = 'notificacion'
        verbose_name = 'Notificación'
        ordering    = ['-fecha_creacion']

    def __str__(self):
        return f"{self.tipo} — {self.titulo}"