from rest_framework import serializers
from .models import Projet, ImputationHoraire, SemaineImputation, Formation
from authentication.models import Utilisateur

class ProjetSerializer(serializers.ModelSerializer):
    equipe_nom = serializers.CharField(source='equipe.nom', read_only=True)
    manager_equipe = serializers.SerializerMethodField()

    class Meta:
        model = Projet
        fields = '__all__'
        extra_fields = ['equipe_nom', 'manager_equipe']

    def get_manager_equipe(self, obj):
        if obj.equipe.manager:
            return {
                'id': obj.equipe.manager.id,
                'nom': obj.equipe.manager.nom,
                'prenom': obj.equipe.manager.prenom
            }
        return None

class ImputationHoraireSerializer(serializers.ModelSerializer):
    projet_nom = serializers.CharField(source='projet.nom', read_only=True)
    
    class Meta:
        model = ImputationHoraire
        fields = '__all__'
        extra_kwargs = {
            'employe': {'read_only': True},
            'valide': {'read_only': True},
            'date_saisie': {'read_only': True},
            'date_validation': {'read_only': True},
            'valide_par': {'read_only': True},
        }

class SemaineImputationSerializer(serializers.ModelSerializer):
    employe_nom = serializers.SerializerMethodField()
    
    class Meta:
        model = SemaineImputation
        fields = '__all__'
        extra_kwargs = {
            'employe': {'read_only': True},
            'date_soumission': {'read_only': True},
            'date_validation': {'read_only': True},
        }
    
    def get_employe_nom(self, obj):
        return f"{obj.employe.prenom} {obj.employe.nom}"

class FormationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formation
        fields = '__all__'
        extra_kwargs = {
            'employe': {'read_only': True},
        }