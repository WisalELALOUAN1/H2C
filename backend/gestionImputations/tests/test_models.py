import pytest
from gestionImputations.models import Projet, ImputationHoraire, SemaineImputation, Formation
from authentication.models import Utilisateur
from gestionUtilisateurs.models import Equipe
from django.db import IntegrityError
from datetime import date
@pytest.fixture
def employe_user(db):
    return Utilisateur.objects.create_user(
        email="employe@example.com",
        password="pass1234",
        nom="Emp",
        prenom="Loyé",
        role="employe"
    )

@pytest.fixture
def admin_user(db):
    return Utilisateur.objects.create_user(
        email="admin@example.com",
        password="pass1234",
        nom="Admin",
        prenom="Root",
        role="admin"
    )

@pytest.fixture
def equipe1(admin_user):
    return Equipe.objects.create(
        nom="Equipe1",
        manager=admin_user
    )

@pytest.mark.django_db
def test_projet_creation(equipe1):
    projet = Projet.objects.create(
        nom="Projet Test",
        description="Test description",
        date_debut="2024-01-01",
        date_fin="2024-12-31",
        taux_horaire=350,
        equipe=equipe1
    )
    assert projet.pk is not None
    assert projet.nom == "Projet Test"
    assert projet.equipe == equipe1

@pytest.mark.django_db
def test_projet_str_repr(equipe1):
    projet = Projet.objects.create(
        nom="API",
        description="desc",
        date_debut="2024-01-01",
        date_fin="2024-12-31",
        equipe=equipe1
    )
    assert "API" in str(projet)

@pytest.mark.django_db
def test_imputationhoraire_creation(admin_user, projet1):
    imp = ImputationHoraire.objects.create(
        employe=admin_user,
        projet=projet1,
        date="2025-07-15",
        heures=3,
        categorie="projet",
        description="Dev"
    )
    assert imp.pk is not None
    assert imp.categorie == "projet"
    assert imp.employe == admin_user

@pytest.mark.django_db
def test_imputationhoraire_unique_projet(admin_user, projet1):
    # Création OK
    ImputationHoraire.objects.create(
        employe=admin_user,
        projet=projet1,
        date="2025-07-16",
        heures=2,
        categorie="projet",
        description="Test"
    )
    # Violation unicité pour la même clé (catégorie projet)
    with pytest.raises(IntegrityError):
        ImputationHoraire.objects.create(
            employe=admin_user,
            projet=projet1,
            date="2025-07-16",
            heures=2,
            categorie="projet",
            description="Test"
        )

@pytest.mark.django_db
def test_imputationhoraire_unique_formation(admin_user, formation1):
    # Création OK
    ImputationHoraire.objects.create(
        employe=admin_user,
        formation=formation1,
        date="2025-07-16",
        heures=2,
        categorie="formation",
        description="Cours"
    )
    # Violation unicité pour la même clé (catégorie formation)
    with pytest.raises(IntegrityError):
        ImputationHoraire.objects.create(
            employe=admin_user,
            formation=formation1,
            date="2025-07-16",
            heures=2,
            categorie="formation",
            description="Cours"
        )

@pytest.mark.django_db
def test_semaineimputation_unique(employe_user):
    s1 = SemaineImputation.objects.create(
        employe=employe_user,
        semaine=28,
        annee=2025
    )
    with pytest.raises(IntegrityError):
        SemaineImputation.objects.create(
            employe=employe_user,
            semaine=28,
            annee=2025
        )

@pytest.mark.django_db
def test_semaineimputation_str(employe_user):
    s = SemaineImputation.objects.create(
        employe=employe_user,
        semaine=30,
        annee=2025
    )
    assert f"Semaine {s.semaine}" in str(s)

@pytest.mark.django_db
def test_formation_creation(employe_user):
    f = Formation.objects.create(
        employe=employe_user,
        type_formation="interne",
        intitule="Python avancé",
        date_debut="2025-07-01",
        date_fin="2025-07-05",
        heures=12.5,
    )
    assert f.pk is not None
    assert f.type_formation == "interne"
    assert f.intitule == "Python avancé"

@pytest.mark.django_db
def test_formation_str(employe_user):
    f = Formation.objects.create(
        employe=employe_user,
        type_formation="interne",
        intitule="Data Science",
        date_debut="2025-07-10",
        date_fin="2025-07-13",
        heures=8,
    )
    assert "Data Science" in str(f)

# --- Fixturage rapide pour projet1 et formation1 si besoin ---
@pytest.fixture
def projet1(equipe1):
    return Projet.objects.create(
        nom="Projet One",
        description="Test",
        date_debut="2025-01-01",
        date_fin="2025-12-31",
        equipe=equipe1
    )

@pytest.fixture
def formation1(employe_user):
    return Formation.objects.create(
        employe=employe_user,
        type_formation="interne",
        intitule="Django",
        date_debut="2025-06-01",
        date_fin="2025-06-10",
        heures=10
    )
