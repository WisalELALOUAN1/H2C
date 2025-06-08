from rest_framework import serializers
from .models import Utilisateur
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
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
class CustomLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Email ou mot de passe incorrect.")
        if not user.is_active:
            raise serializers.ValidationError("Compte inactif.")
        data['user'] = user
        return data