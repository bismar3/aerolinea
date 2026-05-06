from django.apps import AppConfig


class VuelosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'vuelos'

    def ready(self):
        import sys
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv[0:1]:
            from vuelos.scheduler import iniciar_scheduler
            iniciar_scheduler()