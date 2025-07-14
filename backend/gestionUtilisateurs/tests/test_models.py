import pytest
from gestionUtilisateurs.models import Equipe
from authentication.models import Utilisateur

 #la reussite de ces tests montre que le modele equipe fonctionne correctement + la bd et django sont coherent 
def test_pytest_is_working():
    assert 1 == 1

@pytest.mark.django_db
def test_equipe_creation_and_str():
    manager = Utilisateur.objects.create_user(
        email="manager@test.com",
        password="azerty",
        nom="Manager",
        prenom="Un",
        role="manager",
    )
    equipe = Equipe.objects.create(
        nom="Equipe Alpha",
        description="L'équipe de test principale.",
        manager=manager,
    )
    # Test: la methode __str__ retourne le nom de l'équipe
    assert str(equipe) == "Equipe Alpha"
    # Test: le manager est bien celui cree
    assert equipe.manager.email == "manager@test.com"
    # Test: le champ status a bien la valeur pa defaut
    assert equipe.status == "active"
    # Test: la date de creation est bien definie (non nulle)
    assert equipe.date_creation is not None

@pytest.mark.django_db
def test_equipe_membres_many_to_many():
    manager = Utilisateur.objects.create_user(
        email="chef@test.com",
        password="123456",
        nom="Chef",
        prenom="Equipe",
        role="manager",
    )
    membre1 = Utilisateur.objects.create_user(
        email="membre1@test.com",
        password="mdp",
        nom="Membre",
        prenom="Un",
        role="employe",
    )
    membre2 = Utilisateur.objects.create_user(
        email="membre2@test.com",
        password="mdp",
        nom="Membre",
        prenom="Deux",
        role="employe",
    )
    equipe = Equipe.objects.create(
        nom="Test M2M",
        manager=manager,
    )
    # Ajout des membres a l equipe
    equipe.membres.set([membre1, membre2])
    equipe.save()
    # Test: les deux membres sont bien dans l'equipe
    emails = set(equipe.membres.values_list('email', flat=True))
    assert "membre1@test.com" in emails
    assert "membre2@test.com" in emails
    # Test: il y a bien 2 membres
    assert equipe.membres.count() == 2
