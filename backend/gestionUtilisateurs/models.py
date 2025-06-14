from django.db import models
from authentication.models import Utilisateur  # import ton user custom

class Equipe(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    manager = models.ForeignKey(Utilisateur, related_name='equipes_manager', on_delete=models.SET_NULL, null=True)
    membres = models.ManyToManyField(Utilisateur, related_name='equipes_membre')
    date_creation = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=30, default='active')

    def __str__(self):
        return self.nom
