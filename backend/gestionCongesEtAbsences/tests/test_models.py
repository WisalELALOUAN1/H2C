import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from gestionCongesEtAbsences.models import (
    ReglesGlobaux, Parametre, Formule, RegleCongé,
    HistoriqueSolde, DemandeConge, RegleMembrePersonnalisée
)
from authentication.models import Utilisateur
from gestionUtilisateurs.models import Equipe


@pytest.fixture
def admin_user(db):
    return Utilisateur.objects.create_user(
        email="admin@t.com", password="secret", nom="Admin", prenom="User", role="admin"
    )

@pytest.fixture
def equipe1(db, admin_user):
    return Equipe.objects.create(nom="Equipe1", manager=admin_user)

#test la creation des regles globaux
@pytest.mark.django_db
def test_create_regles_globaux():
    rg = ReglesGlobaux.objects.create(
        jours_ouvrables=["lundi", "mardi"],
        jours_feries=["2024-01-01", "2024-05-01"],
    )
    assert rg.pk is not None
    assert "lundi" in rg.jours_ouvrables
    if hasattr(rg.heure_debut_travail, "strftime"):
        assert rg.heure_debut_travail.strftime("%H:%M") == "09:00"
    else:
         rg.heure_debut_travail.startswith("09:00")

# creation  d un parametre  pour une formule
@pytest.mark.django_db
def test_create_parametre():
    param = Parametre.objects.create(cle="nb_jours_max", valeur=10)
    assert param.cle == "nb_jours_max"
    assert param.valeur == 10
    assert param.est_const is False
# test la creation d une formule
@pytest.mark.django_db
def test_create_formule_and_get_expressions():
    f = Formule.objects.create(nom_formule="Standard", expressions={"a": 1})
    assert f.nom_formule == "Standard"
    assert isinstance(f.expressions, dict) or isinstance(f.expressions, str)
    # Test méthode personnalisée get_expressions
    result = f.get_expressions()
    assert isinstance(result, dict)
# Test  d' unicite sur equipe+manager
@pytest.mark.django_db
def test_regleconge_unique_constraint(admin_user, equipe1):
    f = Formule.objects.create(nom_formule="Standard", expressions={})
    regle = RegleCongé.objects.create(equipe=equipe1, manager=admin_user, formule_defaut=f)
    assert regle.pk is not None
    with pytest.raises(IntegrityError):
        RegleCongé.objects.create(equipe=equipe1, manager=admin_user, formule_defaut=f)

@pytest.mark.django_db
def test_regleconge_save_auto_jours_ouvrables_annuels(admin_user, equipe1):
    f = Formule.objects.create(nom_formule="Auto", expressions={})
    # On force jours_ouvrables_annuels a 0 pour tester le calcul automatique
    regle = RegleCongé.objects.create(equipe=equipe1, manager=admin_user, formule_defaut=f, jours_ouvrables_annuels=0)
    regle.refresh_from_db()
    assert regle.jours_ouvrables_annuels > 0

@pytest.mark.django_db
def test_historique_solde(admin_user):
    hs = HistoriqueSolde.objects.create(user=admin_user, solde_actuel=7.5)
    assert hs.solde_actuel == 7.5
    assert hs.user == admin_user

@pytest.mark.django_db
def test_demandeconge_creation_and_invalid_type(admin_user):
    d = DemandeConge.objects.create(
        user=admin_user,
        type_demande="payé",
        date_debut="2024-07-01",
        date_fin="2024-07-10"
    )
    assert d.status == "en attente"
    # Test type_demande invalide (validation)
    bad = DemandeConge(
        user=admin_user,
        type_demande="INVALID",
        date_debut="2024-07-01",
        date_fin="2024-07-10"
    )
    with pytest.raises(ValidationError):
        bad.full_clean()

@pytest.mark.django_db
def test_regle_membre_perso_unique_constraint(admin_user, equipe1):
    f = Formule.objects.create(nom_formule="Perso", expressions={})
    regle = RegleCongé.objects.create(equipe=equipe1, manager=admin_user, formule_defaut=f)
    rm = RegleMembrePersonnalisée.objects.create(regle_equipe=regle, membre=admin_user)
    assert rm.pk is not None
    # Test unicite
    with pytest.raises(IntegrityError):
        RegleMembrePersonnalisée.objects.create(regle_equipe=regle, membre=admin_user)

@pytest.mark.django_db
def test_regles_globaux_str():
    rg = ReglesGlobaux.objects.create(
        jours_ouvrables=["lundi", "mardi", "mercredi"],
        jours_feries=["2024-01-01"]
    )
    assert str(rg).startswith("Règles globales")

@pytest.mark.django_db
def test_formule_meta_ordering():
    f1 = Formule.objects.create(nom_formule="B", expressions={})
    f2 = Formule.objects.create(nom_formule="A", expressions={})
    noms = list(Formule.objects.values_list('nom_formule', flat=True).order_by('nom_formule'))
    assert noms == sorted(noms)

