import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from authentication.models import Utilisateur
@pytest.mark.django_db
def test_register_view_creates_user():
    client = APIClient()
    url = reverse('register')
    data = {
        "email": "newuser@example.com",
        "nom": "New",
        "prenom": "User",
        "role": "employe"
    }
    response = client.post(url, data, format="json")
    assert response.status_code == 201
    assert Utilisateur.objects.filter(email="newuser@example.com").exists()
    assert "Compte créé" in response.data['message']
@pytest.mark.django_db
def test_login_success_first_time():
    # Crée un user avec first_login=True
    user = Utilisateur.objects.create_user(
        email="testlogin@example.com",
        password="Motdepasse12",
        nom="Login",
        prenom="Test",
        role="employe",
        first_login=True,
    )
    client = APIClient()
    url = reverse('custom_login')
    data = {"email": "testlogin@example.com", "password": "Motdepasse12"}
    response = client.post(url, data, format="json")
    assert response.status_code == 200
    assert response.data['first_login'] is True
    assert "changer votre mot de passe" in response.data['message']
@pytest.mark.django_db
def test_password_reset_request_view_sends_email(monkeypatch):
    user = Utilisateur.objects.create_user(
        email="resetme@example.com",
        password="T0utChanger!",
        nom="Reset",
        prenom="Test",
        role="employe"
    )
    client = APIClient()
    url = reverse('password_reset') 
    monkeypatch.setattr("authentication.views.EmailMultiAlternatives.send", lambda self, **kwargs: None)
    data = {"email": "resetme@example.com"}
    response = client.post(url, data, format="json")
    assert response.status_code == 200
    assert "réinitialisation" in response.data['message'].lower()

@pytest.mark.django_db
def test_register_email_already_exists():
    Utilisateur.objects.create_user(
        email="exists@example.com",
        password="azerty",
        nom="Already",
        prenom="Exists",
        role="employe"
    )
    client = APIClient()
    url = reverse('register')
    data = {
        "email": "exists@example.com",
        "nom": "Dup",
        "prenom": "User",
        "role": "employe"
    }
    response = client.post(url, data, format="json")
    assert response.status_code == 400
    assert "existe déjà" in str(response.data).lower()
@pytest.mark.django_db
def test_login_wrong_password():
    Utilisateur.objects.create_user(
        email="wrongpass@example.com",
        password="secret",
        nom="Wrong",
        prenom="Pass",
        role="employe",
        first_login=False
    )
    client = APIClient()
    url = reverse('custom_login')
    data = {"email": "wrongpass@example.com", "password": "badpassword"}
    response = client.post(url, data, format="json")
    assert response.status_code == 400
    assert "incorrect" in str(response.data).lower()
@pytest.mark.django_db
def test_login_inactive_user():
    user = Utilisateur.objects.create_user(
        email="inactive@example.com",
        password="passpass",
        nom="Inactif",
        prenom="User",
        role="employe",
        is_active=False,
        first_login=False
    )
    client = APIClient()
    url = reverse('custom_login')
    data = {"email": "inactive@example.com", "password": "passpass"}
    response = client.post(url, data, format="json")
    assert response.status_code == 400
    assert "incorrect" in str(response.data).lower()

@pytest.mark.django_db
def test_password_reset_unknown_email(monkeypatch):
    client = APIClient()
    url = reverse('password_reset')
    # Patch l'envoi d'email (inutile ici)
    monkeypatch.setattr("authentication.views.EmailMultiAlternatives.send", lambda self, **kwargs: None)
    data = {"email": "nobody@nowhere.com"}
    response = client.post(url, data, format="json")
    assert response.status_code == 404
    assert "non trouvé" in str(response.data).lower()
@pytest.mark.django_db
def test_profile_update_requires_auth():
    user = Utilisateur.objects.create_user(
        email="profileuser@example.com",
        password="topsecret",
        nom="Prof",
        prenom="User",
        role="employe",
        first_login=False
    )
    client = APIClient()
    url = reverse('user_update')
    data = {"nom": "NouvelNom"}
    response = client.put(url, data, format="json")
    assert response.status_code in [401, 403]  # 401: non authentifié, 403: pas de permission
@pytest.mark.django_db
def test_password_change_wrong_old_password():
    user = Utilisateur.objects.create_user(
        email="changepass@example.com", password="oldpass", nom="a", prenom="b", role="employe"
    )
    client = APIClient()
    client.force_authenticate(user=user)
    url = reverse('user_change_password')
    data = {"old_password": "badold", "new_password": "newpass123"}
    response = client.post(url, data, format="json")
    assert response.status_code == 400
    assert "incorrect" in str(response.data).lower()
