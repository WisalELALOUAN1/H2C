from django.db import models
from django.conf import settings
class ReglesGlobaux(models.Model):
    jours_ouvrables = models.JSONField(default=list)  # Utilise un tableau de strings
    heure_debut_travail = models.TimeField(default="09:00")
    heure_fin_travail = models.TimeField(default="17:00")
    pause_midi_debut = models.TimeField(default="13:30")
    pause_midi_fin = models.TimeField(default="14:00")

    def __str__(self):
        return f"Règles globales ({', '.join(self.jours_ouvrables)})"
class Parametre(models.Model):
    cle = models.CharField(max_length=50, unique=True)
    valeur = models.IntegerField()
    est_const = models.BooleanField(default=False)

class Formule(models.Model):
    nom_formule = models.CharField(max_length=100)
    expression = models.TextField()  # e.g. "(jours_travailles * 18) / jours_ouvrables_annuels"

class RegleDeConge(models.Model):
    date_modification = models.DateTimeField(auto_now=True)
    formule_conge = models.ForeignKey(Formule, on_delete=models.CASCADE)
    formule_jours_ouvrable = models.ForeignKey(Formule, on_delete=models.CASCADE, related_name="regle_jours_ouvrable")
    nbr_max_jours_negatif = models.IntegerField(default=-10)

class HistoriqueSolde(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date_modif = models.DateField(auto_now_add=True)
    solde_actuel = models.FloatField()

class DemandeConge(models.Model):
    TYPE_CHOIX = [
        ("payé", "Congé payé"),
        ("spécial", "Spécial"),
        ("sans_solde", "Sans solde"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    type_demande = models.CharField(max_length=30, choices=TYPE_CHOIX)
    date_debut = models.DateField()
    date_fin = models.DateField()
    status = models.CharField(max_length=30, default="en attente")
    commentaire = models.TextField(blank=True)
    demi_jour = models.BooleanField(default=False)
    date_soumission = models.DateTimeField(auto_now_add=True)