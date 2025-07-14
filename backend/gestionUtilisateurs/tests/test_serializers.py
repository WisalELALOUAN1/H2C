import pytest
from gestionUtilisateurs.models import Equipe
from authentication.models import Utilisateur
from gestionUtilisateurs.serializers import EquipeSerializer, EquipeCreateUpdateSerializer, MembreSerializer, EquipeAvecMembresSerializer   

@pytest.mark.django_db
def test_equipe_serializer_output():
    manager= Utilisateur.objects.create_user(email="manager123@gmail.com", password="password123", nom="Manager", prenom="Test", role="manager")
    membre=Utilisateur.objects.create_user(email="membre123@gmail.com", password="password123", nom="Membre", prenom="Test", role="employe")
    equipe=Equipe.objects.create(
        nom="Equipe Test",  description="Description de l'équipe de test",
        manager=manager)
    equipe.membres.add(membre)
    #test de la serialisation en lecture seule EquipeSerializer
    data = EquipeSerializer(equipe).data
    assert data['nom'] == "Equipe Test"
    assert data['description'] == "Description de l'équipe de test"
    assert data['manager']['email']=="manager123@gmail.com"
    assert data['membres'][0]['email'] == "membre123@gmail.com"
    assert data['status'] == "active"
    assert 'date_creation' in data
@pytest.mark.django_db
def test_equipe_create_update_serializer():
    manager = Utilisateur.objects.create_user(email="manager123@gmail.com", password="password123", nom="Manager", prenom="Test", role="manager")
    membre1 = Utilisateur.objects.create_user(email="membre1@gmail.com", password="password123", nom="Membre1", prenom="Test", role="employe")
    membre2 = Utilisateur.objects.create_user(email="membre2gmail.com", password="password123", nom="Membre2", prenom="Test", role="employe")
    #test de serialisation pour la creation 
    input_data={
        "nom": "Equipe Test",
        "description": "Description de l'équipe de test",
        "manager": manager.id,
        "membres": [membre1.id],
        "status": "active"
    }
    serializer=EquipeCreateUpdateSerializer(data=input_data)
    assert serializer.is_valid(), serializer.errors
    equipe = serializer.save()
    assert equipe.nom == "Equipe Test"
    assert equipe.description == "Description de l'équipe de test"
    assert equipe.manager == manager
    assert list(equipe.membres.all()) == [membre1]

@pytest.mark.django_db
def test_equipe_create_update_serializer_with_invalid_manager():
    employe=Utilisateur.objects.create_user(email="emp@gmail.com", password="password123", nom="Employe", prenom="Test", role="employe")
    input_data = {
        "nom": "Equipe Test",
        "description": "Description de l'équipe de test",
        "manager": employe.id,  # Employe au lieu d'un manager
        "membres": [],
        "status": "active"
    }
    serializer = EquipeCreateUpdateSerializer(data=input_data)
    assert not serializer.is_valid()
    assert "manager" in serializer.errors
@pytest.mark.django_db
def test_membre_serializer():
    manager = Utilisateur.objects.create_user(
        email="managerx@example.com", password="zzz", nom="X", prenom="Y", role="manager"
    )
    m1 = Utilisateur.objects.create_user(
        email="m1@example.com", password="aa", nom="M1", prenom="M", role="employe"
    )
    m2 = Utilisateur.objects.create_user(
        email="m2@example.com", password="bb", nom="M2", prenom="N", role="employe"
    )
    equipe = Equipe.objects.create(nom="Equipe Membres", manager=manager)
    equipe.membres.set([m1, m2])
    data = EquipeAvecMembresSerializer(equipe).data
    # Vérifie que tous les membres sont bien dans la sortie sérialisée
    emails = {m["email"] for m in data["membres"]}
    assert "m1@example.com" in emails
    assert "m2@example.com" in emails
    assert data["manager"] == str(manager)
