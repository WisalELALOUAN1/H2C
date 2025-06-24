from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'employe/imputations', views.EmployeImputationViewSet, basename='employe-imputation')
router.register(r'manager/dashboard', views.ManagerDashboardViewSet, basename='manager-dashboard')

urlpatterns = [
    path('employe/imputations/semaine_courante/', views.SemaineCouranteView.as_view(), name='semaine_courante'),
    path('employe/imputations/synthese_mensuelle/', views.SyntheseMensuelleView.as_view(), name='synthese_mensuelle'),
]