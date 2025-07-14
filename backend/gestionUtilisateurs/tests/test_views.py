import pytest
from django.urls import reverse  # pour generer les urls des endpoints a partir de leurs noms
from rest_framework.test import APIClient  # pour la simulation de requetes API
from authentication.models import Utilisateur
from gestionUtilisateurs.models import Equipe
@pytest.fixture
def admin_user(db):
    return Utilisateur.objects.create_superuser(
        email="admintest@gmail.com",password="admin123", nom="Admin", prenom="Test", role="admin")
@pytest.fixture
def manager_user(db):
    return Utilisateur.objects.create_user(
        email="manager@gmail.com",password="manager123", nom="Manager", prenom="Test", role="manager")
@pytest.fixture
def employee_user(db):
    return Utilisateur.objects.create_user(
        email="employe@gmail.com",password="employe123", nom="Employe", prenom="Test", role="employe")
@pytest.mark.django_db
def test_admin_can_create_and_list_teams(admin_user, manager_user, employee_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    url = reverse('equipes-list-create') 
    data = {
        "nom": "Equipe Integration",
        "description": "Equipe gérée par l'admin",
        "manager": manager_user.id,
        "membres": [employee_user.id],
        "status": "active"
    }
    response = client.post(url, data, format="json")
    assert response.status_code == 201
    assert Equipe.objects.filter(nom="Equipe Integration").exists()
    
    # Test de liste des equipes
    response = client.get(url, format="json")
    assert response.status_code == 200
    assert len(response.data) > 0
    assert any(equipe['nom'] == "Equipe Integration" for equipe in response.data)
@pytest.mark.django_db
def test_non_admin_cannot_create_or_update_or_delete_equipe(manager_user, employee_user):
    admin = Utilisateur.objects.create_superuser(
        email="a2@a.com", password="xx", nom="A", prenom="B", role="admin"
    )
    equipe = Equipe.objects.create(nom="ToEdit", manager=manager_user)
    client = APIClient()
    client.force_authenticate(user=employee_user)
    url = reverse('equipes-list-create')
    data = {
        "nom": "Test Refus",
        "description": "Doit échouer",
        "manager": manager_user.id,
        "membres": [employee_user.id],
        "status": "active",
    }
    resp = client.post(url, data, format="json")
    assert resp.status_code in [403, 401]
    # Test update by employee
    detail_url = reverse('equipes-detail', args=[equipe.id])
    resp2 = client.patch(detail_url, {"description": "no"}, format="json")
    assert resp2.status_code in [403, 401]
    # Test delete by employe
    resp3 = client.delete(detail_url)
    assert resp3.status_code in [403, 401]
@pytest.mark.django_db
def test_admin_can_update_and_delete_equipe(admin_user, manager_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    equipe = Equipe.objects.create(nom="Ancienne Equipe", manager=manager_user)
    url = reverse('equipes-detail', args=[equipe.id])
    # Update
    resp = client.patch(url, {"description": "Nouveau desc"}, format="json")
    assert resp.status_code == 200
    assert resp.data["description"] == "Nouveau desc"
    # Detail GET
    resp2 = client.get(url)
    assert resp2.status_code == 200
    assert resp2.data["nom"] == "Ancienne Equipe"
    # Delete
    resp3 = client.delete(url)
    assert resp3.status_code == 204
    assert not Equipe.objects.filter(id=equipe.id).exists()

@pytest.mark.django_db
def test_admin_cannot_create_equipe_with_invalid_manager(admin_user, employee_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    url = reverse('equipes-list-create')
    data = {
        "nom": "Equipe Fausse",
        "description": "Erreur",
        "manager": employee_user.id,  # Not a manager
        "membres": [],
        "status": "active",
    }
    resp = client.post(url, data, format="json")
    assert resp.status_code == 400 or resp.status_code == 403

@pytest.mark.django_db
def test_admin_cannot_create_equipe_with_invalid_membre(admin_user, manager_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    url = reverse('equipes-list-create')
    # ID inexistant pour membre
    data = {
        "nom": "Equipe Fausse",
        "description": "Erreur",
        "manager": manager_user.id,
        "membres": [9999],
        "status": "active",
    }
    resp = client.post(url, data, format="json")
    assert resp.status_code == 400

@pytest.mark.django_db
def test_get_404_on_unknown_equipe(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    url = reverse('equipes-detail', args=[9999])  # id inconnu
    resp = client.get(url)
    assert resp.status_code == 404

@pytest.mark.django_db
def test_manager_can_list_his_equipes(manager_user):
    equipe = Equipe.objects.create(nom="Equipe Manager", manager=manager_user)
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('equipes-avec-membres')
    resp = client.get(url)
    assert resp.status_code == 200
    assert any(eq["nom"] == "Equipe Manager" for eq in resp.data)

@pytest.mark.django_db
def test_anonymous_cannot_access_equipes():
    client = APIClient()
    url = reverse('equipes-list-create')
    resp = client.get(url)
    assert resp.status_code in [401, 403]
    resp2 = client.post(url, {}, format="json")
    assert resp2.status_code in [401, 403]

@pytest.mark.django_db
def test_user_activation_and_role_update(admin_user, employee_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    # Activation
    url = reverse('user-activate', args=[employee_user.id])
    resp = client.patch(url, {"is_active": False}, format="json")
    assert resp.status_code == 200
    employee_user.refresh_from_db()
    assert employee_user.is_active is False
    # Rôle update
    url2 = reverse('user-role-update', args=[employee_user.id])
    resp2 = client.patch(url2, {"role": "manager"}, format="json")
    assert resp2.status_code == 200
    employee_user.refresh_from_db()
    assert employee_user.role == "manager"

@pytest.mark.django_db
def test_user_update_and_get(admin_user, employee_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    url = reverse('user-update', args=[employee_user.id])
    # GET
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.data["email"] == employee_user.email
    # PUT
    resp2 = client.put(url, {
        "email": employee_user.email,
        "nom": "NouveauNom",
        "prenom": employee_user.prenom,
        "role": employee_user.role
    }, format="json")
    assert resp2.status_code == 200
    employee_user.refresh_from_db()
    assert employee_user.nom == "NouveauNom"

@pytest.mark.django_db
def test_user_activation_errors(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    # id inconnu
    url = reverse('user-activate', args=[9999])
    resp = client.patch(url, {"is_active": False}, format="json")
    assert resp.status_code == 404
    # Pas de champ
    u = Utilisateur.objects.create_user(
        email="n@a.com", password="xx", nom="n", prenom="a", role="employe"
    )
    url2 = reverse('user-activate', args=[u.id])
    resp2 = client.patch(url2, {}, format="json")
    assert resp2.status_code == 400

@pytest.mark.django_db
def test_user_role_update_errors(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    # id inconnu
    url = reverse('user-role-update', args=[9999])
    resp = client.patch(url, {"role": "manager"}, format="json")
    assert resp.status_code == 404
    # Invali role
    u = Utilisateur.objects.create_user(
        email="n2@a.com", password="xx", nom="n2", prenom="a", role="employe"
    )
    url2 = reverse('user-role-update', args=[u.id])
    resp2 = client.patch(url2, {"role": "invalidrole"}, format="json")
    assert resp2.status_code == 400