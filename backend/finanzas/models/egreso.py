from django.db import models


class Egreso(models.Model):
    TIPO_CHOICES = [
        ('devolucion',    'Devolución de pasaje'),
        ('operacional',   'Gasto operacional'),
        ('otro',          'Otro egreso'),
    ]

    id_egreso       = models.AutoField(primary_key=True)
    id_devolucion   = models.IntegerField(null=True, blank=True)  # FK lógica a Devolucion
    concepto        = models.CharField(max_length=200)
    tipo            = models.CharField(max_length=20, choices=TIPO_CHOICES, default='devolucion')
    monto           = models.DecimalField(max_digits=10, decimal_places=2)
    fecha           = models.DateTimeField(auto_now_add=True)
    observaciones   = models.TextField(blank=True, null=True)

    class Meta:
        db_table    = 'egreso'
        verbose_name = 'Egreso'
        ordering    = ['-fecha']
        

    def __str__(self):
        return f"Egreso Bs. {self.monto} — {self.concepto}"