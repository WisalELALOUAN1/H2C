from rest_framework import serializers
from .models import Utilisateur
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
class UtilisateurSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = Utilisateur
        fields = ('id', 'email', 'nom', 'prenom', 'role', 'password')
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Utilisateur.objects.create_user(password=password, **validated_data)
        return user
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Tu peux ajouter d'autres infos au token si besoin
        token['email'] = user.email
        token['role'] = user.role
        token['nom'] = user.nom
        token['prenom'] = user.prenom
        return token

    def validate(self, attrs):
        # Utilisation du champ email pour l'authentification
        credentials = {
            'email': attrs.get("email"),
            'password': attrs.get("password")
        }
        from django.contrib.auth import authenticate
        user = authenticate(**credentials)
        if user is None:
            from rest_framework import serializers
            raise serializers.ValidationError("Email ou mot de passe incorrect.")
        data = super().validate(attrs)
        # Ajoute les infos utiles dans la réponse
        data.update({
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'nom': user.nom,
                'prenom': user.prenom,
            }
        })
        return data
