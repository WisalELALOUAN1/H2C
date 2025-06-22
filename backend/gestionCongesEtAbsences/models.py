from django.db import models
from django.conf import settings
from gestionUtilisateurs.models import Equipe
import json
class ReglesGlobaux(models.Model):
    jours_ouvrables = models.JSONField(default=list) 
    jours_feries = models.JSONField(default=list)
    heure_debut_travail = models.TimeField(default="09:00")
    heure_fin_travail = models.TimeField(default="17:00")
    pause_midi_debut = models.TimeField(default="13:30")
    pause_midi_fin = models.TimeField(default="14:00")
    pays_feries = models.CharField(max_length=100, blank=True, null=True) 

    def __str__(self):
        return f"Règles globales ({', '.join(self.jours_ouvrables)})"
class Parametre(models.Model):
    cle = models.CharField(max_length=50, unique=True)
    valeur = models.IntegerField()
    est_const = models.BooleanField(default=False)

class Formule(models.Model):
    nom_formule = models.CharField(max_length=255)
    expressions = models.JSONField(default=dict)
    est_defaut = models.BooleanField(default=False)
    publique = models.BooleanField(default=True)

    class Meta:
        ordering = ['nom_formule']

    def get_expressions(self):
        try:
            return json.loads(self.expressions)
        except Exception:
            return {}

    class Meta:
        ordering = [ 'nom_formule']
class RegleCongé(models.Model):
    equipe = models.ForeignKey(Equipe, on_delete=models.CASCADE)
    manager = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    formule_defaut = models.ForeignKey(Formule, on_delete=models.SET_NULL, null=True, blank=True)
    nbr_max_negatif = models.IntegerField(
        default=0,
        help_text="Nombre maximum de jours de congé pouvant être négatif"
    )
    jours_ouvrables_annuels = models.IntegerField(
        default=230,
        help_text="Calculé automatiquement si vide: (52 semaines * 5 jours) - 18 jours - jours fériés"
    )
    jours_acquis_annuels = models.IntegerField(
        default=18,
        help_text="Nombre de jours de congé acquis par an"
    )
    
    date_mise_a_jour = models.DateTimeField(auto_now=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.jours_ouvrables_annuels:
            regles_globales = ReglesGlobaux.objects.first()
            nb_feries = len(regles_globales.jours_feries) if regles_globales else 10
            self.jours_ouvrables_annuels = (52 * 5) - 18 - nb_feries
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ('equipe', 'manager')

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


class RegleMembrePersonnalisée(models.Model):
    regle_equipe = models.ForeignKey(RegleCongé, on_delete=models.CASCADE)
    membre = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    formule_personnalisee = models.TextField(blank=True)
    jours_ouvrables_perso = models.IntegerField(null=True, blank=True)
    actif = models.BooleanField(default=True)

    class Meta:
        unique_together = ('regle_equipe', 'membre')