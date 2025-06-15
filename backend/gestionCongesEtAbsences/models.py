from django.db import models

class ReglesGlobaux(models.Model):
    jours_ouvrables = models.JSONField(default=list)  # Utilise un tableau de strings
    heure_debut_travail = models.TimeField(default="09:00")
    heure_fin_travail = models.TimeField(default="17:00")
    pause_midi_debut = models.TimeField(default="13:30")
    pause_midi_fin = models.TimeField(default="14:00")

    def __str__(self):
        return f"Règles globales ({', '.join(self.jours_ouvrables)})"
