from django.db import models
from reservas.models import Ticket


class Devolucion(models.Model):
    MOTIVO_CHOICES = [
        # Cliente cancela
        ('cliente_cancela',    'Cliente cancela voluntariamente'),
        # BOA cancela
        ('meteorologia',       'Cancelación por meteorología — BOA'),
        ('falta_cupos',        'Cancelación por falta de cupos — BOA'),
        ('administracion',     'Cancelación administrativa — BOA'),
    ]

    ESTADO_CHOICES = [
        ('pendiente',  'Pendiente de procesar'),
        ('procesada',  'Procesada'),
        ('rechazada',  'Rechazada'),
    ]

    id_devolucion       = models.AutoField(primary_key=True)
    id_ticket           = models.OneToOneField(
                              Ticket,
                              on_delete=models.CASCADE,
                              db_column='id_ticket',
                              related_name='devolucion'
                          )
    motivo              = models.CharField(max_length=30, choices=MOTIVO_CHOICES)
    porcentaje_reembolso = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    monto_original      = models.DecimalField(max_digits=10, decimal_places=2)
    monto_reembolso     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estado              = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    observaciones       = models.TextField(blank=True, null=True)
    fecha_solicitud     = models.DateTimeField(auto_now_add=True)
    fecha_procesado     = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table    = 'devolucion'
        verbose_name = 'Devolución'
        ordering    = ['-fecha_solicitud']
        

    def __str__(self):
        return f"Devolución {self.id_ticket.codigo_ticket} — {self.porcentaje_reembolso}%"

    @staticmethod
    def calcular_porcentaje(clase, motivo, tiene_oferta):
        """
        Calcula el porcentaje de reembolso según la política de BOA.
        """
        # Si BOA cancela — porcentaje según motivo sin importar clase ni oferta
        if motivo == 'meteorologia':
            return 50
        if motivo == 'falta_cupos':
            return 80
        if motivo == 'administracion':
            return 100

        # Cliente cancela
        if tiene_oferta:
            return 0  # Boleto en oferta nunca reembolsable

        porcentajes = {
            'economica':         0,
            'economica_premium': 0,
            'ejecutiva':         50,
            'primera_clase':     100,
        }
        return porcentajes.get(clase, 0)