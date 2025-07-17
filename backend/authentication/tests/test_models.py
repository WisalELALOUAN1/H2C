import pytest
from authentication.models import Utilisateur

@pytest.mark.django_db #pour utiliser la bd des test de django
def test_create_user_and_str():
    user = Utilisateur.objects.create_user(
        email="user@example.com",
        password="s3cr3t!",
        nom="User",
        prenom="Test",
        role="admin",
    )

    assert user.email == "user@example.com" # Verifie que l'email est correct
    assert user.check_password("s3cr3t!") # Verifie que le mot de passe est correct
    assert str(user) == "user@example.com" # Verifie que la representation en string de l'utilisateur est correcte
@pytest.mark.django_db
def test_create_superuser_flags():
    admin = Utilisateur.objects.create_superuser(
        email="admin@example.com",
        password="adminpass",
        nom="Admin",
        prenom="Root",
        role="admin",
    )
    assert admin.is_superuser is True
    assert admin.is_staff is True