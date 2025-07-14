import pytest
from gestionCongesEtAbsences.models import (
    ReglesGlobaux, DemandeConge, HistoriqueSolde, Formule, RegleCongé, RegleMembrePersonnalisée
)
from gestionCongesEtAbsences.serializers import (
    ReglesGlobauxSerializer, DemandeCongeSerializer, HistoriqueSoldeSerializer, FormuleSerializer,
    RegleCongeSerializer, RegleMembreSerializer, SoldeDetailSerializer
)
from authentication.models import Utilisateur
from gestionUtilisateurs.models import Equipe
from datetime import date, timedelta
@pytest.fixture
def admin_user(db):
    return Utilisateur.objects.create_user(
        email="admin@example.com", password="xxx", nom="Admin", prenom="User", role="admin"
    )

@pytest.fixture
def equipe1(admin_user, db):
    return Equipe.objects.create(
        nom="Equipe1",
        description="desc",
        manager=admin_user
    )
@pytest.mark.django_db
def test_regles_globaux_serializer():
    rg = ReglesGlobaux.objects.create(
        jours_ouvrables=["lundi", "mardi"],
        jours_feries=["2024-01-01"],
        pays_feries="Maroc"
    )
    serializer = ReglesGlobauxSerializer(rg)
    data = serializer.data
    assert "jours_ouvrables" in data
    assert data["pays_feries"] == "Maroc"

@pytest.mark.django_db
def test_demande_conge_serializer_ok(admin_user):
    debut = date.today() + timedelta(days=2)
    fin = date.today() + timedelta(days=5)
    serializer = DemandeCongeSerializer(data={
        "user": admin_user.id,
        "type_demande": "payé",
        "date_debut": debut,
        "date_fin": fin
    })
    # Champ user est read-only donc on force via .save(user=...)
    assert serializer.is_valid(), serializer.errors
    demande = serializer.save(user=admin_user)
    assert demande.type_demande == "payé"
    assert demande.status == "en attente"

@pytest.mark.django_db
def test_demande_conge_serializer_date_passee(admin_user):
    debut = date.today() - timedelta(days=2)
    fin = date.today() + timedelta(days=1)
    serializer = DemandeCongeSerializer(data={
        "user": admin_user.id,
        "type_demande": "payé",
        "date_debut": debut,
        "date_fin": fin
    })
    assert not serializer.is_valid()
    assert "début" in str(serializer.errors).lower()

@pytest.mark.django_db
def test_demande_conge_serializer_fin_avant_debut(admin_user):
    debut = date.today() + timedelta(days=4)
    fin = date.today() + timedelta(days=2)
    serializer = DemandeCongeSerializer(data={
        "user": admin_user.id,
        "type_demande": "payé",
        "date_debut": debut,
        "date_fin": fin
    })
    assert not serializer.is_valid()
    assert "fin" in str(serializer.errors).lower()

@pytest.mark.django_db
def test_formule_serializer():
    f = Formule.objects.create(nom_formule="FormuleA", expressions={"a": 1, "b": 2})
    serializer = FormuleSerializer(f)
    assert serializer.data["nom_formule"] == "FormuleA"
    assert "expressions" in serializer.data

@pytest.mark.django_db
def test_regleconge_serializer_computed_field(admin_user, equipe1):
    f = Formule.objects.create(nom_formule="FormuleTest", expressions={})
    regle = RegleCongé.objects.create(equipe=equipe1, manager=admin_user, formule_defaut=f)
    serializer = RegleCongeSerializer(regle, context={"request": type("Req", (), {"data": {}})()})
    data = serializer.data
    assert "jours_conges_acquis" in data

@pytest.mark.django_db
def test_reglemembre_serializer(admin_user, equipe1):
    f = Formule.objects.create(nom_formule="FormulePerso", expressions={})
    regle = RegleCongé.objects.create(equipe=equipe1, manager=admin_user, formule_defaut=f)
    m = RegleMembrePersonnalisée.objects.create(regle_equipe=regle, membre=admin_user)
    serializer = RegleMembreSerializer(m)
    assert serializer.data["membre"] == admin_user.id

@pytest.mark.django_db
def test_historique_solde_serializer(admin_user):
    hs = HistoriqueSolde.objects.create(user=admin_user, solde_actuel=8.0)
    serializer = HistoriqueSoldeSerializer(hs)
    assert serializer.data["solde_actuel"] == 8.0


