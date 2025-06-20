from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    ReglesGlobauxRetrieveUpdateView, EmployeDashboardView,
    DemandeCongeCreateView, ManagerPendingRequestsView,
    DemandeCongeValidationView, DemandeCongeRetrieveUpdateDestroyView,
    HolidayAPIView, EquipesManagerView, DashboardManagerView,
    FormuleListView, RegleCongeViewSet, RegleMembreViewSet,
    CalendarDataView
)

router = DefaultRouter()
router.register(r'regles-conge', RegleCongeViewSet, basename='regles-conge')
router.register(r'regles-membre', RegleMembreViewSet, basename='regles-membre')

urlpatterns = [
    path('regles-globaux/', ReglesGlobauxRetrieveUpdateView.as_view(), name="regles-globaux"),
    path('employe/dashboard/', EmployeDashboardView.as_view()),
    path('demande-conge/', DemandeCongeCreateView.as_view()),
    path('manager/demandes-attente/', ManagerPendingRequestsView.as_view()),
    path('manager/valider-demande/<int:demande_id>/', DemandeCongeValidationView.as_view()),
    path('demande-conge/<int:pk>/', DemandeCongeRetrieveUpdateDestroyView.as_view(), name='demande-conge-detail'),
    path('holidays/', HolidayAPIView.as_view(), name='holidays-api'),
    path('mon-tableau-de-bord/', EmployeDashboardView.as_view(), name='dashboard-employe'),
    path('manager/mes-equipes/', EquipesManagerView.as_view(), name='mes-equipes'),
    path('manager/tableau-de-bord/', DashboardManagerView.as_view(), name='dashboard-manager'),
    path('formules/', FormuleListView.as_view(), name='formules-list'),
    path('calendrier/', CalendarDataView.as_view(), name='calendar-data'),
]

urlpatterns += router.urls
