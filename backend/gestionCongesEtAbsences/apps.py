from django.apps import AppConfig

class GestioncongesetabsencesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "gestionCongesEtAbsences"

    def ready(self):
        # Appele automatiquement au demarrage
        try:
            from .formules_init import creer_formules_par_defaut
            creer_formules_par_defaut()
        except Exception as e:
            
            print(f"[Formules par défaut non créées] {e}")
