from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet,
    ManagerImputationViewSet,
    EmployeImputationViewSet,
    ManagerDashboardViewSet,
    SemaineCouranteView,
    SyntheseMensuelleView
)

router = DefaultRouter()
router.register(r'projets', ProjectViewSet, basename='projet')
router.register(r'manager/imputations', ManagerImputationViewSet, basename='manager-imputation')
router.register(r'employe/imputations', EmployeImputationViewSet, basename='employe-imputation')
router.register(r'manager/dashboard', ManagerDashboardViewSet, basename='manager-dashboard')

urlpatterns = [
    path('', include(router.urls)),
    path('semaine_courante/', SemaineCouranteView.as_view(), name='semaine-courante'),
    path('synthese_mensuelle/', SyntheseMensuelleView.as_view(), name='synthese-mensuelle'),
    path('manager/reporting/', ManagerDashboardViewSet.as_view({'get': 'reporting'}), name='manager-reporting'),
]