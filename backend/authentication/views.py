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
from django.contrib.auth.hashers import make_password

class RegisterView(APIView):
    def post(self, request):
        serializer = UtilisateurSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

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
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        try:
            user = Utilisateur.objects.get(email=email)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Email non trouvé.'}, status=404)

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