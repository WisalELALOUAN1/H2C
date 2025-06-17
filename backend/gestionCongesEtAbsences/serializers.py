from rest_framework import serializers
from .models import ReglesGlobaux, DemandeConge, HistoriqueSolde # Import des modèles nécessaires
from datetime import date
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
