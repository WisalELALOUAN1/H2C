from rest_framework import serializers
from .models import Utilisateur
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
import secrets
class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ('id', 'email', 'nom', 'prenom', 'role', 'password')
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        temporary_password = secrets.token_urlsafe(8)
        validated_data['password'] = temporary_password  # Envoi du mot de passe en clair à create_user
        validated_data['first_login'] = True
        
        # create_user va hacher le mot de passe automatiquement
        user = Utilisateur.objects.create_user(**validated_data)
        return user, temporary_password
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
class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField()

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Ancien mot de passe incorrect.")
        return value
class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['prenom', 'nom', 'email']  # rôle non modifiable ici

    def validate_email(self, value):
        user = self.context['request'].user
        if Utilisateur.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value