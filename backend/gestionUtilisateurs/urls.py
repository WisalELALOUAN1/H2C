from django.urls import path
from .views import (
    EquipeListCreateView,
    EquipeRetrieveUpdateDestroyView,
    UserListView,
    UserActivationView,
    UserRoleUpdateView,
    UtilisateurRetrieveUpdateView,
    EquipeCreateUpdateSerializer,
    EquipeMembresListView,
    
)

urlpatterns = [
    # Equipes
    path('equipes/', EquipeListCreateView.as_view(), name='equipes-list-create'),
    path('equipes/<int:pk>/', EquipeRetrieveUpdateDestroyView.as_view(), name='equipes-detail'),
    path('equipes/create/', EquipeCreateUpdateSerializer, name='equipe-create'),
    path('manager/mes-equipes/', EquipeMembresListView.as_view(), name='equipes-avec-membres'),

     # Utilisateurs
    path('users/', UserListView.as_view(), name='users-list'),
    path('users/<int:user_id>/activate/', UserActivationView.as_view(), name='user-activate'),
    path('users/<int:user_id>/role/', UserRoleUpdateView.as_view(), name='user-role-update'),
    path('users/<int:pk>/', UtilisateurRetrieveUpdateView.as_view(), name='user-update'),

]
