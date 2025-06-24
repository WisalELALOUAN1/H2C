from django.db import models
from authentication.models import Utilisateur  
from django.contrib.auth import get_user_model
User=get_user_model
class Projet(models.Model):
    CATEGORIES_PROJET = (
        ('client', 'Projet Client'),
        ('interne', 'Projet Interne'),
        ('r&d', 'Recherche et Développement'),
    )
    identifiant = models.CharField(max_length=50, unique=True)
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    date_debut=models.DateField()
    date_fin=models.DateField()
    taux_horaire = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    categorie = models.CharField(max_length=20, choices=CATEGORIES_PROJET, default='interne')
    equipe = models.ForeignKey('gestionUtilisateurs.Equipe', on_delete=models.CASCADE, related_name='projets', null=True, blank=True,)
    actif=models.BooleanField(default=True)
    def __str__(self):
        return f"{self.nom} ({self.identifiant})"
class ImputationHoraire(models.Model):
    CATEGORIES_TEMPS = (
        ('projet', 'Heures productives (projets)'),
        ('formation', 'Formation'),
        ('absence', 'Absence'),
        ('autre', 'Autre activité'),
    )
    employe = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='imputations')
    projet = models.ForeignKey(Projet, on_delete=models.CASCADE, related_name='imputations')
    date= models.DateField()
    heures = models.DecimalField(max_digits=5, decimal_places=2)
    categorie = models.CharField(max_length=20, choices=CATEGORIES_TEMPS, default='projet')
    description = models.TextField(blank=True)
    valide= models.BooleanField(default=False)
    date_saisie = models.DateTimeField(auto_now_add=True)
    date_validation = models.DateTimeField(null=True, blank=True)
    valide_par = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name='validations')
    class Meta:
        unique_together = ('employe', 'projet', 'date')
        ordering = ['-date', 'employe']
    
    def __str__(self):
        return f"{self.employe} - {self.projet} - {self.date}: {self.heures}h"
class SemaineImputation(models.Model):
    STATUTS = (
        ('brouillon', 'Brouillon'),
        ('soumis', 'Soumis pour validation'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
    )
    
    employe = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='semaines_imputation')
    semaine = models.IntegerField()  # Numéro de semaine ISO
    annee = models.IntegerField()
    statut = models.CharField(max_length=20, choices=STATUTS, default='brouillon')
    date_soumission = models.DateTimeField(null=True, blank=True)
    date_validation = models.DateTimeField(null=True, blank=True)
    commentaire = models.TextField(blank=True)
    class Meta:
        unique_together = ('employe', 'semaine', 'annee')
        ordering = ['-annee', '-semaine']
    
    def __str__(self):
        return f"Semaine {self.semaine}/{self.annee} - {self.employe}"
class Formation(models.Model):
    TYPE_FORMATION = (
        ('interne', 'Formation Interne'),
        ('externe', 'Formation Externe'),
        ('autoformation', 'Autoformation'),
    )
    
    employe = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='formations')
    type_formation = models.CharField(max_length=20, choices=TYPE_FORMATION)
    intitule = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date_debut = models.DateField()
    date_fin = models.DateField()
    heures = models.DecimalField(max_digits=5, decimal_places=2)
    justificatif = models.FileField(upload_to='formations/justificatifs/', null=True, blank=True)
    
    def __str__(self):
        return f"{self.intitule} - {self.employe}"

