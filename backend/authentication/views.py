from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import UtilisateurSerializer
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

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
