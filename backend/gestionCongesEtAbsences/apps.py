from django.apps import AppConfig

class GestioncongesetabsencesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "gestionCongesEtAbsences"

    def ready(self):
        from .formules_init import creer_formules_par_defaut
        try:
            creer_formules_par_defaut()
        except Exception:
            # Évite les erreurs lors des premières migrations ou tests
            pass
