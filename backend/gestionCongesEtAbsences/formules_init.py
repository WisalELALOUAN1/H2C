from .models import Formule

def creer_formules_par_defaut():
    formules = [
        {
            "nom_formule": "Calcul simple congés acquis",
            "expression": "(jours_travailles * 18) / jours_ouvrables_annuels",
            "est_defaut": True,
            "publique": True
        },
        {
            "nom_formule": "Calcul jours ouvrables annuels",
            "expression": "(52 * 5) - 18 - jours_feries",
            "est_defaut": False,
            "publique": True
        }
    ]

    for f in formules:
        Formule.objects.get_or_create(
            nom_formule=f["nom_formule"],
            defaults={
                "expression": f["expression"],
                "est_defaut": f["est_defaut"],
                "publique": f["publique"]
            }
        )
