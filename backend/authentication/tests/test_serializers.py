import pytest
from authentication.serializers import UtilisateurSerializer
from authentication.models import Utilisateur
#tests pour verifier la logique de creation d'un utilisateur sans toucher a l api
@pytest.mark.django_db
def test_utilisateur_serializer_create():
    data = {
        "email": "bob@example.com",
        "nom": "Bob",
        "prenom": "Builder",
        "role": "employe",
    }
    serializer = UtilisateurSerializer(data=data)
    assert serializer.is_valid(), serializer.errors
    user, temp_pwd = serializer.save()
    assert Utilisateur.objects.filter(email="bob@example.com").exists()
    assert user.first_login is True
    assert user.email == "bob@example.com"
    assert isinstance(temp_pwd, str) and len(temp_pwd) > 0
@pytest.mark.django_db
def test_utilisateur_serializer_missing_fields():
    data = {
        "email": "missing@example.com",
        # "nom" oublié !
        "prenom": "Test",
        "role": "employe"
    }
    serializer = UtilisateurSerializer(data=data)
    assert not serializer.is_valid()
    assert "nom" in serializer.errors
@pytest.mark.django_db
def test_utilisateur_serializer_email_exists():
    Utilisateur.objects.create_user(
        email="exists2@example.com", password="xx", nom="a", prenom="b", role="employe"
    )
    data = {
        "email": "exists2@example.com",
        "nom": "Dup",
        "prenom": "User",
        "role": "employe"
    }
    serializer = UtilisateurSerializer(data=data)
    assert not serializer.is_valid()
    assert "email" in serializer.errors
@pytest.mark.django_db
def test_profile_update_email_already_used():
    u1 = Utilisateur.objects.create_user(
        email="testu1@example.com", password="xx", nom="a", prenom="b", role="employe"
    )
    u2 = Utilisateur.objects.create_user(
        email="testu2@example.com", password="xx", nom="a", prenom="b", role="employe"
    )
    from authentication.serializers import ProfileUpdateSerializer
    serializer = ProfileUpdateSerializer(
        u2,
        data={"email": "testu1@example.com"},
        context={"request": type("FakeReq", (), {"user": u2})()},
    )
    assert not serializer.is_valid()
    assert "email" in serializer.errors
