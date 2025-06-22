from django.apps import AppConfig

class GestioncongesetabsencesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "gestionCongesEtAbsences"

    def ready(self):
        # Appelé automatiquement au démarrage
        try:
            from .formules_init import creer_formules_par_defaut
            creer_formules_par_defaut()
        except Exception as e:
            #  Ne pas faire de requêtes DB avant les migrations
            print(f"[Formules par défaut non créées] {e}")
