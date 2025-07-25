from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import UtilisateurSerializer
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Utilisateur
import secrets
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer
from .serializers import CustomLoginSerializer
from rest_framework import status
from rest_framework import serializers
from .serializers import PasswordChangeSerializer, ProfileUpdateSerializer

class RegisterView(APIView):
    def post(self, request):
        serializer = UtilisateurSerializer(data=request.data)
        if serializer.is_valid():
            user, temporary_password = serializer.save()

            # Envoi du mail de bienvenue avec template HTML
            subject = "Bienvenue sur SGIRP"
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = [user.email]

            # Générer le HTML à partir du template
            html_content = render_to_string(
                "email/welcome_email.html",  # adapte le chemin si besoin
                {
                    "user_name": f"{user.prenom} {user.nom}",
                    "user_email": user.email,
                    "user_role": user.role.capitalize(),
                    "temporary_password": temporary_password,
                }
            )

            # Fallback texte brut pour clients mail basiques
            text_content = (
                f"Bonjour {user.prenom} {user.nom},\n\n"
                "Votre compte a bien été créé sur le Système de Gestion Interne RH & Projets.\n"
                f"Identifiant : {user.email}\nRôle : {user.role}\n\n"
                "Merci et bienvenue !"
            )

            email = EmailMultiAlternatives(subject, text_content, from_email, to_email)
            email.attach_alternative(html_content, "text/html")
            email.send(fail_silently=False)

            return Response({'message': 'Compte créé ! Vérifiez votre email.'}, status=status.HTTP_201_CREATED)

        # Gestion du cas "email déjà utilisé" (unicité)
        errors = serializer.errors
        if "email" in errors:
            for err in errors["email"]:
                if "already exists" in str(err) or "existe déjà" in str(err):
                    return Response(
                        {"error": "Un compte avec cet email existe déjà."},
                        status=status.HTTP_400_BAD_REQUEST,content_type='application/json'
                    )
        # Retourne les autres erreurs telles quelles
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        try:
            user = Utilisateur.objects.get(email=email)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Email non trouvé.'}, status=404,content_type='application/json')

        # Générer un code unique, valable 1 heure
        reset_token = secrets.token_urlsafe(12)
        expiry = timezone.now() + timedelta(hours=1)
        user.reset_token = reset_token
        user.reset_token_expiry = expiry
        user.save()

        # Préparer l'email HTML
        context = {
            'user_name': f"{user.prenom} {user.nom}",
            'reset_token': reset_token,
        }
        subject = "Réinitialisation de mot de passe - SGIRP"
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [user.email]
        text_content = f"Votre code de réinitialisation est : {reset_token}"
        html_content = render_to_string("email/reset_password_email.html", context)

        mail = EmailMultiAlternatives(subject, text_content, from_email, to_email)
        mail.attach_alternative(html_content, "text/html")
        mail.send()

        return Response({'message': 'Un code de réinitialisation a été envoyé par email.'})
class PasswordResetConfirmView(APIView):
    def post(self, request):
        email = request.data.get('email')
        reset_token = request.data.get('reset_token')
        new_password = request.data.get('new_password')

        try:
            user = Utilisateur.objects.get(email=email)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=404)

        # Vérifier le code et l’expiration
        if (not user.reset_token or user.reset_token != reset_token or
            not user.reset_token_expiry or timezone.now() > user.reset_token_expiry):
            return Response({'error': 'Code de réinitialisation invalide ou expiré.'}, status=400)

        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        user.save()
        return Response({'message': 'Mot de passe réinitialisé avec succès.'})
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
class CustomLoginView(APIView):
    def post(self, request):
        serializer = CustomLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            if user.first_login:
                return Response({'first_login': True, 'message': "Vous devez changer votre mot de passe."}, status=200)
            refresh = RefreshToken.for_user(user)
            # Ajouter les infos utilisateur dans la réponse
            user_data = {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "nom": user.nom,
                "prenom": user.prenom,
                "date_joined": user.date_joined.strftime('%Y-%m-%d'),
                "is_active": user.is_active
            }
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': user_data,
            })
        return Response(serializer.errors, status=400)

class FirstPasswordChangeView(APIView):
    permission_classes = []
    def post(self, request):
        email = request.data.get('email')
        new_password = request.data.get('new_password')
        try:
            user = Utilisateur.objects.get(email=email)
            if not user.first_login:
                return Response({'error': 'Mot de passe déjà changé.'}, status=400)
            user.set_password(new_password)
            user.first_login = False
            user.save()
            return Response({'message': 'Mot de passe mis à jour, vous pouvez vous connecter.'})
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=404)
        
class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    def put(self, request):
        user = request.user
        serializer = ProfileUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profil mis à jour avec succès."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"message": "Mot de passe mis à jour avec succès."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UtilisateurSerializer(user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        serializer = UtilisateurSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profil mis à jour avec succès."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)