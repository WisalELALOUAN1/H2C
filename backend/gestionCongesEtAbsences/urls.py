from django.urls import path
from .views import ReglesGlobauxRetrieveUpdateView, EmployeDashboardView, DemandeCongeCreateView, ManagerPendingRequestsView, DemandeCongeValidationView, DemandeCongeRetrieveUpdateDestroyView

urlpatterns = [
    path('regles-globaux/', ReglesGlobauxRetrieveUpdateView.as_view(), name="regles-globaux"),
    path('employe/dashboard/', EmployeDashboardView.as_view()),
    path('demande-conge/', DemandeCongeCreateView.as_view()),
    path('manager/demandes-attente/', ManagerPendingRequestsView.as_view()),
    path('manager/valider-demande/<int:demande_id>/', DemandeCongeValidationView.as_view()),
    path('demande-conge/<int:pk>/', DemandeCongeRetrieveUpdateDestroyView.as_view(), name='demande-conge-detail'),
]
