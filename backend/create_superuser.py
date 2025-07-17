"""
(create_superuser.py)
Crée – ou met à jour – un super‑utilisateur **uniquement**
s’il n’en existe encore aucun dans la base.
Le script est idempotent : on peut le relancer sans danger.
"""

import os
import django
from django.core.exceptions import ValidationError
from django.db import transaction
from django.contrib.auth import get_user_model

# 1) Indiquer où se trouvent les settings AVANT django.setup()
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sgrip.settings")

django.setup()
User = get_user_model()

# 2) Paramètres issus des variables d’environnement
email  = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
pwd    = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin")
nom    = os.getenv("DJANGO_SUPERUSER_NOM", "Admin")
prenom = os.getenv("DJANGO_SUPERUSER_PRENOM", "Super")
role   = os.getenv("DJANGO_SUPERUSER_ROLE", "admin")   # <- ton champ « role »

try:
    with transaction.atomic():

        # 3) S’il existe déjà *un* super‑user, on ne touche à rien
        if User.objects.filter(is_superuser=True).exists():
            print(" Un super‑utilisateur existe déjà → aucune action.")
            exit(0)

        # 4) Sinon, on crée / met à jour celui dont l’email est fourni
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "nom": nom,
                "prenom": prenom,
                "role": role,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if created:
            user.set_password(pwd)
            user.save()
            print(f"Super‑utilisateur créé : {email}")
        else:
            # (Cas peu probable si is_superuser déjà False)
            user.nom = nom
            user.prenom = prenom
            user.role = role
            user.is_staff = True
            user.is_superuser = True
            if not user.check_password(pwd):
                user.set_password(pwd)
            user.save()
            print(f"  Utilisateur « {email} » mis à niveau en super‑admin")

except ValidationError as exc:
    print(f" Impossible de créer le super‑utilisateur : {exc}")
