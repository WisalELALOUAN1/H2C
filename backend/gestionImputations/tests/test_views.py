# gestionImputations/tests/test_views.py

import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from django.utils import timezone
from datetime import date, timedelta

from gestionImputations.models import Projet, ImputationHoraire, SemaineImputation,Formation
from gestionUtilisateurs.models import Equipe
from authentication.models import Utilisateur
import calendar
@pytest.mark.django_db
def test_project_viewset_list_manager(manager_user, equipe1, projet1):
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('projet-list')
    response = client.get(url)
    assert response.status_code == 200
    assert any(projet['id'] == projet1.id for projet in response.data)

@pytest.mark.django_db
def test_project_viewset_list_employe(employe_user, equipe1, projet1):
    equipe1.membres.add(employe_user)
    projet1.equipe = equipe1
    projet1.save()
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse('projet-list')
    response = client.get(url)
    assert response.status_code == 200
    assert any(projet['id'] == projet1.id for projet in response.data)

@pytest.mark.django_db
def test_project_equipes_disponibles(manager_user, equipe1):
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('equipes-disponibles')
    response = client.get(url)
    assert response.status_code == 200
    assert any(eq['id'] == equipe1.id for eq in response.data)

@pytest.mark.django_db
def test_project_creation_by_manager(manager_user, equipe1):
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('projet-list')
    data = {
        "nom": "Nouveau projet",
        "description": "test",
        "date_debut": str(date.today()),
        "date_fin": str(date.today() + timedelta(days=5)),
        "equipe": equipe1.id
    }
    response = client.post(url, data)
    assert response.status_code in (201, 200)
    assert Projet.objects.filter(nom="Nouveau projet", equipe=equipe1).exists()

@pytest.mark.django_db
def test_manager_imputation_list_forbidden_for_employe(employe_user):
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse('manager-imputation-list')
    response = client.get(url)
    assert response.status_code == 403

@pytest.mark.django_db
def test_manager_imputation_list_success(manager_user, equipe1, employe_user):
    equipe1.manager = manager_user
    equipe1.save()
    equipe1.membres.add(employe_user)
    semaine = SemaineImputation.objects.create(employe=employe_user, semaine=20, annee=2025, statut='soumis')
    imputation = ImputationHoraire.objects.create(
        employe=employe_user, projet=None, date=date.today(), heures=5, categorie='projet'
    )
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('manager-imputation-list')
    response = client.get(url)
    assert response.status_code == 200
    assert 'semaines' in response.data

@pytest.mark.django_db
def test_employee_week_entries_success(manager_user, equipe1, employe_user):
    equipe1.manager = manager_user
    equipe1.save()
    equipe1.membres.add(employe_user)
    week = date.today().isocalendar()[1]
    imputation = ImputationHoraire.objects.create(
        employe=employe_user, projet=None, date=date.today(), heures=7, categorie='projet'
    )
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('manager-imputation-employee-week-entries',
                  kwargs={'employee_id': employe_user.id, 'year': date.today().year, 'week': week})
    response = client.get(url)
    assert response.status_code == 200
    assert response.data["employee_id"] == employe_user.id
    assert any(float(i['heures']) == 7 for i in response.data["imputations"])

@pytest.mark.django_db
def test_employee_week_entries_forbidden(manager_user, autre_employe):
    client = APIClient()
    client.force_authenticate(user=manager_user)
    week = date.today().isocalendar()[1]
    url = reverse('manager-imputation-employee-week-entries',
                  kwargs={'employee_id': autre_employe.id, 'year': date.today().year, 'week': week})
    response = client.get(url)
    assert response.status_code == 403
@pytest.mark.django_db
def test_formation_list_and_create(employe_user):
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse('training-list')
    # Aucun au départ
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.data == []

    # Création formation
    data = {
        "intitule": "Python avancé",
        "type_formation": "interne",
        "date_debut": str(date.today()),
        "date_fin": str(date.today() + timedelta(days=2)),
        "heures": 16,
    }
    resp2 = client.post(url, data)
    assert resp2.status_code in (201, 200)
    assert Formation.objects.filter(employe=employe_user, intitule="Python avancé").exists()

import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from datetime import date
from gestionImputations.models import Projet, ImputationHoraire
from gestionUtilisateurs.models import Equipe

@pytest.mark.django_db
def test_employe_imputation_list_and_create(employe_user):

    equipe = Equipe.objects.create(nom="EquipeX")
    equipe.membres.add(employe_user)

    projet = Projet.objects.create(
        nom="Test", date_debut=date.today(), date_fin=date.today(), equipe=equipe, taux_horaire=100
    )

    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse('employe-imputation-list')

    # Aucun au début
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.data == []

    # Création imputation
    data = {
        "date": str(date.today()),
        "heures": 4,
        "categorie": "projet",
        "projet_id": projet.id,  
        "description": "Dev projet X"
    }
    resp2 = client.post(url, data)
    print("DEBUG resp2:", resp2.status_code, resp2.data)
    assert resp2.status_code in (201, 200)
    assert ImputationHoraire.objects.filter(employe=employe_user, description="Dev projet X").exists()


@pytest.mark.django_db
def test_employe_imputation_formations_employe(employe_user):
    formation = Formation.objects.create(
        employe=employe_user,
        intitule="Test formation",
        type_formation="Technique",
        date_debut=date.today(),
        date_fin=date.today(),
        heures=8
    )
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse('employe-imputation-formations-employe')
    resp = client.get(url)
    assert resp.status_code == 200
    assert any(f['intitule'] == "Test formation" for f in resp.data)

@pytest.mark.django_db
def test_employe_imputation_projets_employe(employe_user, projet1):
    # L'utilisateur est membre de l'équipe du projet
    projet1.equipe.membres.add(employe_user)
    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse('employe-imputation-projets-employe')
    resp = client.get(url)
    assert resp.status_code == 200
    assert any(p['id'] == projet1.id for p in resp.data)

import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from datetime import date, timedelta

from gestionImputations.models import Projet, ImputationHoraire, SemaineImputation
from gestionUtilisateurs.models import Equipe
from authentication.models import Utilisateur

@pytest.mark.django_db
def test_manager_dashboard_list(manager_user):

    equipe = Equipe.objects.create(nom="EquipeD", manager=manager_user)
    employe = Utilisateur.objects.create_user(email="emp1@example.com", password="test", nom="Doe", prenom="John", role="employe")
    equipe.membres.add(employe)
    projet = Projet.objects.create(nom="ProjetD", date_debut=date.today(), date_fin=date.today()+timedelta(days=2), equipe=equipe, taux_horaire=200)
    sem = SemaineImputation.objects.create(employe=employe, semaine=date.today().isocalendar()[1], annee=date.today().year, statut="soumis")
    # Imputation projet
    ImputationHoraire.objects.create(employe=employe, projet=projet, date=date.today(), heures=6, categorie="projet", description="Travail proj")
    # Imputation formation
    ImputationHoraire.objects.create(employe=employe, date=date.today(), heures=2, categorie="formation", description="Formation")
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('manager-dashboard-list')
    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()

    assert "semaines_a_valider" in data
    assert "charge_par_projet" in data
    assert "charge_par_categorie" in data
    assert "charge_par_employe" in data
    assert "projets_en_retard" in data
    assert "periode" in data
    assert "equipes" in data
  
    assert "Formation" in [v["label"] for v in data["charge_par_categorie"].values()]
    assert data["charge_par_categorie"]["projet"]["heures"] == 6
    assert data["charge_par_categorie"]["formation"]["heures"] == 2

@pytest.mark.django_db
def test_manager_dashboard_list_no_team(manager_user):
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('manager-dashboard-list')
    resp = client.get(url)
    assert resp.status_code == 400
    assert resp.json()["error"] == "Vous ne gérez aucune équipe"
@pytest.mark.django_db
def test_manager_dashboard_projets(manager_user):
    equipe = Equipe.objects.create(nom="EquipeX", manager=manager_user)
    Projet.objects.create(nom="Proj1", date_debut=date.today(), date_fin=date.today(), equipe=equipe, taux_horaire=110)
    Projet.objects.create(nom="Proj2", date_debut=date.today(), date_fin=date.today(), equipe=equipe, taux_horaire=111)
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('manager-dashboard-projets')
    resp = client.get(url)
    assert resp.status_code == 200
    noms = [proj["nom"] for proj in resp.json()]
    assert "Proj1" in noms and "Proj2" in noms
@pytest.mark.django_db
def test_manager_dashboard_validate_week(manager_user):
    equipe = Equipe.objects.create(nom="EquipeY", manager=manager_user)
    employe = Utilisateur.objects.create_user(email="emp2@example.com", password="test", nom="Doe", prenom="Jane", role="employe")
    equipe.membres.add(employe)
    sem = SemaineImputation.objects.create(employe=employe, semaine=date.today().isocalendar()[1], annee=date.today().year, statut="soumis")
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('manager-dashboard-validate-week', kwargs={"pk": sem.id})
    resp = client.post(url, {"action": "valider"})
    assert resp.status_code == 200
    sem.refresh_from_db()
    assert sem.statut == "valide"
    

@pytest.mark.django_db
def test_manager_dashboard_validate_week_forbidden(manager_user, autre_employe):
    # Manager n'est pas manager de l'employe
    sem = SemaineImputation.objects.create(employe=autre_employe, semaine=date.today().isocalendar()[1], annee=date.today().year, statut="soumis")
    client = APIClient()
    client.force_authenticate(user=manager_user)
    url = reverse('manager-dashboard-validate-week', kwargs={"pk": sem.id})
    resp = client.post(url, {"action": "valider"})
    assert resp.status_code == 403
    assert "erreur" in resp.json() or "error" in resp.json()
@pytest.mark.django_db
def test_semaine_courante_view(employe_user):
    from gestionImputations.models import Projet, ImputationHoraire

    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse('semaine-courante')

    # Création manuelle d'un projet et d'une imputation
    projet = Projet.objects.create(
        nom="TestProjet",
        date_debut=date.today(),
        date_fin=date.today() + timedelta(days=30),
        taux_horaire=150
    )
    lundi = date.today() - timedelta(days=date.today().weekday())
    imputation = ImputationHoraire.objects.create(
        employe=employe_user,
        projet=projet,
        date=lundi,
        heures=4,
        categorie='projet'
    )

    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert data['total_heures'] == 4
    assert data['imputations'][0]['id'] == imputation.id
    assert data['imputations'][0]['projet']['id'] == projet.id
    assert data['statut'] == 'brouillon'
    assert lundi.isoformat() in data['dates_semaine']

@pytest.mark.django_db
def test_synthese_mensuelle_view(employe_user):
    from gestionImputations.models import Projet, ImputationHoraire
    from datetime import date

    client = APIClient()
    client.force_authenticate(user=employe_user)
    url = reverse('synthese-mensuelle')

    # On cree un projet et une imputation dans le mois courant
    projet = Projet.objects.create(
        nom="ProjetTest",
        date_debut=date.today().replace(day=1),
        date_fin=date.today().replace(day=28),
        taux_horaire=200
    )
    ImputationHoraire.objects.create(
        employe=employe_user,
        projet=projet,
        date=date.today().replace(day=2),
        heures=7,
        categorie='projet'
    )

    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert data['total_heures'] == 7
    assert data['total_valeur'] == 1400  # 7 * 200
    assert "ProjetTest" in data['synthese']
    assert data['periode']['debut'].startswith(str(date.today().year))
@pytest.mark.django_db
def test_daily_imputation_get(employe_user):
    from gestionImputations.models import Projet, ImputationHoraire
    client = APIClient()
    client.force_authenticate(user=employe_user)
    projet = Projet.objects.create(nom="ProjetZ", date_debut=date.today(), date_fin=date.today(), taux_horaire=90)
    # Ajoute une imputation pour la date d’aujourd’hui
    imp = ImputationHoraire.objects.create(
        employe=employe_user, projet=projet, date=date.today(), heures=2, categorie="projet"
    )
    url = reverse('daily-imputations-date', kwargs={"date": date.today().isoformat()})
    resp = client.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert data["date"] == date.today().isoformat()
    assert data["total_heures"] == 2
    assert len(data["imputations"]) == 1
    assert data["imputations"][0]["id"] == imp.id

@pytest.mark.django_db
def test_daily_imputation_post(employe_user):
    from gestionImputations.models import Projet
    client = APIClient()
    client.force_authenticate(user=employe_user)
    projet = Projet.objects.create(nom="ProjetY", date_debut=date.today(), date_fin=date.today(), taux_horaire=75)
    url = reverse('daily-imputations')
    data = {
        "date": date.today().isoformat(),
        "heures": 3,
        "categorie": "projet",
        "projet_id": projet.id,
        "description": "Dev"
    }
    resp = client.post(url, data, format='json')
    assert resp.status_code == 201
    assert resp.data["heures"] == "3.00" or float(resp.data["heures"]) == 3
    assert resp.data["projet"]["id"] == projet.id

@pytest.mark.django_db
def test_daily_imputation_patch(employe_user):
    from gestionImputations.models import Projet, ImputationHoraire
    client = APIClient()
    client.force_authenticate(user=employe_user)
    projet = Projet.objects.create(nom="ProjetModif", date_debut=date.today(), date_fin=date.today(), taux_horaire=55)
    imp = ImputationHoraire.objects.create(
        employe=employe_user, projet=projet, date=date.today(), heures=5, categorie="projet"
    )
    url = reverse('delete-imputation', kwargs={"id": imp.id})
    data = {
        "heures": 7,
        "description": "Modification",
    }
    resp = client.patch(url, data, content_type="application/json")
    assert resp.status_code == 200
    assert resp.data["heures"] == "7.00" or float(resp.data["heures"]) == 7
    assert resp.data["description"] == "Modification"
@pytest.mark.django_db
def test_daily_imputation_delete(employe_user):
    from gestionImputations.models import Projet, ImputationHoraire
    client = APIClient()
    client.force_authenticate(user=employe_user)
    projet = Projet.objects.create(nom="ProjetDel", date_debut=date.today(), date_fin=date.today(), taux_horaire=99)
    imp = ImputationHoraire.objects.create(
        employe=employe_user, projet=projet, date=date.today(), heures=1, categorie="projet"
    )
    url = reverse('delete-imputation', kwargs={"id": imp.id})
    resp = client.delete(url)
    assert resp.status_code == 204
    # Il n’existe plus
    from gestionImputations.models import ImputationHoraire as IH
    assert not IH.objects.filter(id=imp.id).exists()
