import pytest
from django.contrib.auth import get_user_model
from gestionUtilisateurs.models import Equipe
from gestionImputations.models import Projet

User = get_user_model()

@pytest.fixture
def manager_user(db):
    return User.objects.create_user(
        email='manager@example.com',
        password='managerpass',
        role='manager',
        nom='Manager',
        prenom='Test'
    )

@pytest.fixture
def employe_user(db):
    return User.objects.create_user(
        email='employe@example.com',
        password='employepass',
        role='employe',
        nom='Employe',
        prenom='Test'
    )

@pytest.fixture
def autre_employe(db):
    return User.objects.create_user(
        email='autre_employe@example.com',
        password='autrepass',
        role='employe',
        nom='Autre',
        prenom='Test'
    )

@pytest.fixture
def equipe1(manager_user):
    equipe = Equipe.objects.create(
        nom="Equipe1",
        manager=manager_user
    )
    return equipe

@pytest.fixture
def projet1(equipe1):
    return Projet.objects.create(
        nom="Projet Test",
        description="desc",
        date_debut="2025-01-01",
        date_fin="2025-12-31",
        equipe=equipe1
    )
