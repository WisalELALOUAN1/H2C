from rest_framework import serializers
from .models import Equipe
from authentication.models import Utilisateur
from authentication.serializers import UtilisateurSerializer

class UtilisateurListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ('id', 'email', 'nom', 'prenom', 'role', 'is_active', 'date_joined')

class EquipeSerializer(serializers.ModelSerializer):
    manager = UtilisateurSerializer(read_only=True)
    membres = UtilisateurSerializer(many=True, read_only=True)

    class Meta:
        model = Equipe
        fields = ['id', 'nom', 'description', 'manager', 'membres', 'date_creation', 'status']
