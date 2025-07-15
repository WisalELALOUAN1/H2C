import pytest
from gestionImputations.models import Projet, ImputationHoraire, SemaineImputation, Formation
from gestionImputations.serializers import (
    ProjetSerializer,
    ImputationHoraireSerializer,
    SemaineImputationSerializer,
    FormationSerializer
)
from authentication.models import Utilisateur
from gestionUtilisateurs.models import Equipe

import datetime


@pytest.fixture
def admin_user(db):
    return Utilisateur.objects.create_user(
        email="admin@example.com", password="pass1234",
        nom="Admin", prenom="Root", role="admin"
    )

@pytest.fixture
def employe_user(db):
    return Utilisateur.objects.create_user(
        email="employe@example.com", password="pass1234",
        nom="Emp", prenom="Loyé", role="employe"
    )

@pytest.fixture
def equipe1(admin_user):
    return Equipe.objects.create(nom="Equipe1", manager=admin_user)

@pytest.fixture
def projet1(equipe1):
    return Projet.objects.create(
        nom="Projet A", description="Projet test",
        date_debut="2025-01-01", date_fin="2025-12-31",
        equipe=equipe1
    )

@pytest.fixture
def formation1(employe_user):
    return Formation.objects.create(
        employe=employe_user, type_formation="interne",
        intitule="Python",  date_debut=datetime.date(2025, 6, 1),   
        date_fin=datetime.date(2025, 6, 5),
        heures=15
    )

@pytest.fixture
def imputation1(employe_user, projet1):
    return ImputationHoraire.objects.create(
        employe=employe_user, projet=projet1, date="2025-07-01",
        heures=7.5, categorie="projet", description="Dev API"
    )

@pytest.fixture
def semaine1(employe_user):
    return SemaineImputation.objects.create(
        employe=employe_user, semaine=27, annee=2025
    )




@pytest.mark.django_db
def test_projet_serializer(projet1):
    serializer = ProjetSerializer(projet1)
    data = serializer.data
    assert data["nom"] == "Projet A"
    assert "equipe_nom" in data
    assert data["equipe_nom"] == "Equipe1"
    assert data["actif"] is True



@pytest.mark.django_db
def test_formation_serializer(formation1):
    serializer = FormationSerializer(formation1)
    data = serializer.data
    assert data["intitule"] == "Python"
    assert data["type_formation"] == "interne"
    assert data["heures"] == "15.00"
    assert "duree_jours" in data
    assert data["duree_jours"] == 5



@pytest.mark.django_db
def test_imputation_serializer(imputation1):
    serializer = ImputationHoraireSerializer(imputation1)
    data = serializer.data
    assert data["heures"] == "7.50"
    assert data["categorie"] == "projet"
    assert data["description"] == "Dev API"
    assert data["projet_nom"] == "Projet A"
    assert data["employe"]["email"] == "employe@example.com"

@pytest.mark.django_db
def test_imputation_serializer_validation(employe_user, projet1):
    # Donnees valides
    data = {
        "employe_id": employe_user.id,
        "projet_id": projet1.id,
        "date": "2025-07-10",
        "heures": 6,
        "categorie": "projet",
        "description": "Tâche X"
    }
    serializer = ImputationHoraireSerializer(data=data)
    assert serializer.is_valid(), serializer.errors
    obj = serializer.save()
    assert obj.pk is not None



@pytest.mark.django_db
def test_semaineimputation_serializer(semaine1):
    serializer = SemaineImputationSerializer(semaine1)
    data = serializer.data
    assert data["semaine"] == 27
    assert data["annee"] == 2025
    assert data["statut"] == "brouillon"
    assert "employe_nom" in data
    assert "Emp" in data["employe_nom"]
