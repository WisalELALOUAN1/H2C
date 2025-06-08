from rest_framework import serializers
from .models import Utilisateur

class UtilisateurSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = Utilisateur
        fields = ('id', 'email', 'nom', 'prenom', 'role', 'password')
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Utilisateur.objects.create_user(password=password, **validated_data)
        return user
