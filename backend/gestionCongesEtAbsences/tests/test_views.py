import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from gestionCongesEtAbsences.models import DemandeConge, ReglesGlobaux, Formule, RegleCongé
from gestionUtilisateurs.models import Equipe
from authentication.models import Utilisateur
@pytest.fixture
def admin_user(db):
    return Utilisateur.objects.create_superuser(
        email="admin@example.com", password="adminpass", nom="Admin", prenom="Super", role="admin"
    )

@pytest.fixture
def manager_user(db):
    return Utilisateur.objects.create_user(
        email="manager@example.com", password="managerpass", nom="Manager", prenom="Boss", role="manager"
    )

@pytest.fixture
def employe_user(db):
    return Utilisateur.objects.create_user(
        email="employe@example.com", password="employepass", nom="Employe", prenom="Worker", role="employe"
    )

@pytest.fixture
def equipe1(db, manager_user):
    equipe = Equipe.objects.create(
        nom="Equipe1", manager=manager_user, description="Equipe test", status="active"
    )
    return equipe
@pytest.mark.django_db
def test_employe_can_submit_demande(employe_user):
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse("demande-conge-list")
    data = {
        "type_demande": "payé",
        "date_debut": "2025-08-10",
        "date_fin": "2025-08-15",
        "demi_jour": False
    }
    response = client.post(url, data, format="json")
    assert response.status_code in [201, 200]
    assert DemandeConge.objects.filter(user=employe_user, type_demande="payé").exists()

@pytest.mark.django_db
def test_employe_dashboard(employe_user):
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse("dashboard-employe")
    response = client.get(url)
    assert response.status_code == 200
    assert "solde" in response.data

@pytest.mark.django_db
def test_manager_can_list_pending_requests(manager_user, employe_user, equipe1):
    equipe1.membres.add(employe_user)
    DemandeConge.objects.create(
        user=employe_user, type_demande="payé",
        date_debut="2025-08-01", date_fin="2025-08-05"
    )
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse("manager-demandes-attente")
    response = client.get(url)
    assert response.status_code == 200
    assert any(req["user_id"] == employe_user.id for req in response.data)


@pytest.mark.django_db
def test_manager_can_validate_request(manager_user, employe_user, equipe1):
    equipe1.membres.add(employe_user)
    demande = DemandeConge.objects.create(
        user=employe_user, type_demande="payé",
        date_debut="2025-08-01", date_fin="2025-08-05"
    )
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse("manager-valider-demande", args=[demande.id])
    response = client.post(url, {"status": "validé", "commentaire": "OK"}, format="json")
    assert response.status_code == 200
    demande.refresh_from_db()
    assert demande.status == "validé"



@pytest.mark.django_db
def test_non_manager_cannot_validate(employe_user, manager_user, equipe1):
    equipe1.membres.add(manager_user)
    demande = DemandeConge.objects.create(
        user=manager_user, type_demande="payé",
        date_debut="2025-08-01", date_fin="2025-08-05"
    )
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse("manager-valider-demande", args=[demande.id])
    response = client.post(url, {"status": "validé"}, format="json")
    assert response.status_code in [403, 401]
@pytest.mark.django_db
def test_employe_cannot_delete_others_demande(employe_user, admin_user):
    # Création d'une demande par admin_user
    demande = DemandeConge.objects.create(
        user=admin_user, type_demande="payé",
        date_debut="2025-08-10", date_fin="2025-08-12"
    )
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse("demande-conge-detail", args=[demande.id])
    response = client.delete(url)
    assert response.status_code in [403, 401]

@pytest.mark.django_db
def test_regles_globaux_get_and_update(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    url = reverse("regles-globaux")
    # Récupération
    response = client.get(url)
    assert response.status_code == 200
    # Update
    data = response.data
    data["heure_debut_travail"] = "08:30"
    response2 = client.put(url, data, format="json")
    assert response2.status_code in [200, 201]
    assert response2.data["heure_debut_travail"].startswith("08:30")

@pytest.mark.django_db
def test_solde_view(employe_user):
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse("mon_solde")
    response = client.get(url)
    assert response.status_code == 200
    assert "solde_actuel" in response.data

@pytest.mark.django_db
def test_admin_historique_solde_view(admin_user, employe_user):
    from gestionCongesEtAbsences.models import HistoriqueSolde
    HistoriqueSolde.objects.create(user=employe_user, solde_actuel=10.0)
    client = APIClient()
    client.force_authenticate(user=admin_user)
    url = reverse("admin-historique-soldes")
    response = client.get(url)
    assert response.status_code == 200
    assert len(response.data) > 0

@pytest.mark.django_db
def test_holiday_api(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    url = reverse("holidays-api")
    response = client.get(url, {"country": "MA"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)

