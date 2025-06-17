from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Equipe
from authentication.models import Utilisateur  # on importe le modèle User de l'autre app
from .serializers import EquipeSerializer, UtilisateurListSerializer, EquipeCreateUpdateSerializer
from authentication.serializers import UtilisateurSerializer
# ==== Equipes ====

class EquipeListCreateView(generics.ListCreateAPIView):
    queryset = Equipe.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EquipeCreateUpdateSerializer
        return EquipeSerializer

# RETRIEVE/UPDATE/DESTROY
class EquipeRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Equipe.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return EquipeCreateUpdateSerializer
        return EquipeSerializer

# ==== Utilisateurs ====

class UserListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        users = Utilisateur.objects.all()
        serializer = UtilisateurListSerializer(users, many=True)
        return Response(serializer.data)

class UserActivationView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, user_id):
        try:
            user = Utilisateur.objects.get(id=user_id)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable'}, status=404)
        is_active = request.data.get('is_active')
        if is_active is not None:
            user.is_active = bool(is_active)
            user.save()
            return Response({'message': f"Utilisateur {'activé' if user.is_active else 'désactivé'}"})
        return Response({'error': 'Champ is_active requis'}, status=400)

class UserRoleUpdateView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, user_id):
        try:
            user = Utilisateur.objects.get(id=user_id)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable'}, status=404)
        role = request.data.get('role')
        if role in ['admin', 'manager', 'employe']:
            user.role = role
            user.save()
            return Response({'message': 'Rôle mis à jour'})
        return Response({'error': 'Rôle invalide'}, status=400)
class UtilisateurRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [permissions.IsAdminUser]
