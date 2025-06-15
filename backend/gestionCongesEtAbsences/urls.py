from django.urls import path
from .views import ReglesGlobauxRetrieveUpdateView

urlpatterns = [
    path('regles-globaux/', ReglesGlobauxRetrieveUpdateView.as_view(), name="regles-globaux"),
]
