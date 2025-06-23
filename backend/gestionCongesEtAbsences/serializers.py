from rest_framework import serializers
from .models import ReglesGlobaux, DemandeConge, HistoriqueSolde,Formule, RegleCongé, RegleMembrePersonnalisée # Import des modèles nécessaires
from datetime import date
from authentication.serializers import UtilisateurSerializer  # Assurez-vous que ce serializer est défini dans authentication/serializers.py
class ReglesGlobauxSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReglesGlobaux
        fields = '__all__'

class DemandeCongeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandeConge
        fields = '__all__'
        read_only_fields = ('user', 'status', 'date_soumission')

    def validate(self, data):
        # Validation de la date
        if data['date_debut'] < date.today():
            raise serializers.ValidationError("La date de début ne peut pas être dans le passé")
        
        if data['date_fin'] < data['date_debut']:
            raise serializers.ValidationError("La date de fin doit être après la date de début")
        
        # Vérification que la demande peut être modifiée
        instance = self.instance
        if instance and instance.status != 'en attente':
            raise serializers.ValidationError("Seules les demandes en attente peuvent être modifiées")
        
        return data

class HistoriqueSoldeSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoriqueSolde
        fields = '__all__'
class FormuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formule
        fields = '__all__'
class RegleCongeSerializer(serializers.ModelSerializer):
    jours_conges_acquis = serializers.SerializerMethodField()

    class Meta:
        model = RegleCongé
        fields = [
            'id',
            'equipe',
            'formule_defaut',
            'jours_ouvrables_annuels',
            'jours_acquis_annuels',
            'date_mise_a_jour',
            'jours_conges_acquis',
            'nbr_max_negatif',
              # champ calculé exposé
        ]

    def get_jours_conges_acquis(self, obj):
        # Récupérer le contexte de la requête
        request = self.context.get('request')

        # Valeurs par défaut si non fournies dans la requête
        jours_travailles = 230
        if request and request.data.get('jours_travailles'):
            try:
                jours_travailles = int(request.data.get('jours_travailles'))
            except (TypeError, ValueError):
                pass

        jours_ouvrables_annuels = obj.jours_ouvrables_annuels or 0

        # Appeler la fonction de calcul avec ces valeurs
        return calculer_conges_acquis(jours_travailles, jours_ouvrables_annuels)
class RegleMembreSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegleMembrePersonnalisée
        fields = ['regle_equipe', 'membre']
        read_only_fields = ['regle_equipe']  # Pour éviter que le membre modifie la règle de l'équipe
def calculer_conges_acquis(jours_travailles, jours_ouvrables_annuels=230):
    return (jours_travailles * 18) / jours_ouvrables_annuels
def calculer_jours_ouvrables_annuels(nb_feries=10):
    return (52*5) - 18 - nb_feries
# Dans gestionAbsencesConges/serializers.py
class HistoriqueSoldeSerializer(serializers.ModelSerializer):
    user = UtilisateurSerializer(read_only=True)
    difference = serializers.SerializerMethodField()

    class Meta:
        model = HistoriqueSolde
        fields = ['id', 'user', 'date_modif', 'solde_actuel', 'difference']

    def get_difference(self, obj):
        if hasattr(obj, 'difference'):
            return obj.difference
        return None