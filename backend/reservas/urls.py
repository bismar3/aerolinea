from django.urls import path
from reservas.views import callback_pago

urlpatterns = [
    path('pago/callback/', callback_pago, name='callback_pago'),
]