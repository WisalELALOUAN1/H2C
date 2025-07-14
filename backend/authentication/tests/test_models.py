import pytest
from authentication.models import Utilisateur

@pytest.mark.django_db
def test_create_user_and_str():
    user = Utilisateur.objects.create_user(
        email="user@example.com",
        password="s3cr3t!",
        nom="User",
        prenom="Test",
        role="admin",
    )

    assert user.email == "user@example.com"
    # Vérifie que le mot de passe est bien hashé
    assert user.check_password("s3cr3t!")
    # Vérifie la méthode __str__
    assert str(user) == "user@example.com"
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