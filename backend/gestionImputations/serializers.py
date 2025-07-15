from rest_framework import serializers
from .models import Projet, ImputationHoraire, SemaineImputation, Formation
from authentication.models import Utilisateur
from gestionUtilisateurs.serializers import UtilisateurSerializer
class FormationSerializer(serializers.ModelSerializer):
    employe = UtilisateurSerializer(read_only=True)
    justificatif_url = serializers.SerializerMethodField()
    duree_jours = serializers.SerializerMethodField()
    
    class Meta:
        model = Formation
        fields = [
            'id', 'employe', 'type_formation', 'intitule', 'description',
            'date_debut', 'date_fin', 'heures', 'justificatif', 'justificatif_url',
            'duree_jours'
        ]
    
    def get_justificatif_url(self, obj):
        """Retourne l'URL complète du justificatif"""
        if obj.justificatif:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.justificatif.url)
        return None
    
    def get_duree_jours(self, obj):
        """Calcule la durée en jours"""
        return (obj.date_fin - obj.date_debut).days + 1
class ProjetSerializer(serializers.ModelSerializer):
    equipe_nom = serializers.CharField(source='equipe.nom', read_only=True)
    manager_equipe = serializers.SerializerMethodField()

    class Meta:
        model = Projet
        fields = '__all__'
        extra_fields = ['equipe_nom', 'manager_equipe']

    def get_manager_equipe(self, obj):
        if obj.equipe and obj.equipe.manager:
            return {
                'id': obj.equipe.manager.id,
                'nom': obj.equipe.manager.nom,
                'prenom': obj.equipe.manager.prenom
            }
        return None
class SyntheseMensuelleSerializer(serializers.Serializer):
    projet = serializers.CharField()
    heures = serializers.DecimalField(max_digits=10, decimal_places=2)
    valeur = serializers.DecimalField(max_digits=12, decimal_places=2)
class ImputationHoraireSerializer(serializers.ModelSerializer):
   
    formation_nom = serializers.CharField(source='formation.intitule', read_only=True)
    projet_nom = serializers.CharField(source='projet.nom', read_only=True)
    projet_identifiant = serializers.CharField(source='projet.identifiant', read_only=True)
    

    employe = UtilisateurSerializer(read_only=True)
    projet = ProjetSerializer(read_only=True)
    formation = FormationSerializer(read_only=True)
    valide_par = UtilisateurSerializer(read_only=True)
    
    
    employe_id = serializers.IntegerField(write_only=True, required=False)
    projet_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    formation_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ImputationHoraire
        fields = [
            'id', 'date', 'heures', 'categorie', 'description', 'valide',
            'date_saisie', 'date_validation',
            
            'employe', 'projet', 'formation', 'valide_par',
            
            'formation_nom', 'projet_nom', 'projet_identifiant',
            
            'employe_id', 'projet_id', 'formation_id'
        ]
        extra_kwargs = {
            'valide': {'read_only': True},
            'date_saisie': {'read_only': True},
            'date_validation': {'read_only': True},
        }

    def validate(self, data):
        """Validation des données"""
        cat = data.get('categorie')

        
        if 'employe_id' in data:
            try:
                data['employe'] = Utilisateur.objects.get(id=data.pop('employe_id'))
            except Utilisateur.DoesNotExist:
                raise serializers.ValidationError({'employe_id': 'Utilisateur non trouvé'})

        if 'projet_id' in data:
            projet_id = data.pop('projet_id')
            if projet_id:
                try:
                    data['projet'] = Projet.objects.get(id=projet_id)
                except Projet.DoesNotExist:
                    raise serializers.ValidationError({'projet_id': 'Projet non trouvé'})
            else:
                data['projet'] = None

        if 'formation_id' in data:
            formation_id = data.pop('formation_id')
            if formation_id:
                try:
                    data['formation'] = Formation.objects.get(id=formation_id)
                except Formation.DoesNotExist:
                    raise serializers.ValidationError({'formation_id': 'Formation non trouvée'})
            else:
                data['formation'] = None

        
        if cat == 'projet' and not data.get('projet'):
            raise serializers.ValidationError({'projet': 'Projet requis pour cette catégorie'})
        
        if cat == 'formation' and not data.get('formation'):
            raise serializers.ValidationError({'formation': 'Formation requise pour cette catégorie'})

       
        if cat == 'projet':
            data['formation'] = None
        elif cat == 'formation':
            data['projet'] = None
        elif cat in ['absence', 'reunion', 'admin', 'autre']:
            data['projet'] = None
            data['formation'] = None

       
        heures = data.get('heures')
        if heures is not None:
            if heures <= 0 or heures > 24:
                raise serializers.ValidationError({'heures': 'Les heures doivent être entre 0 et 24'})

        return data

    def create(self, validated_data):
        """Création d'une imputation"""
        return ImputationHoraire.objects.create(**validated_data)

    def update(self, instance, validated_data):
        """Mise à jour d'une imputation"""
        # Empecher la modification si validee
        if instance.valide and not self.context.get('force_update', False):
            raise serializers.ValidationError('Impossible de modifier une imputation validée')
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

    def to_representation(self, instance):
        """Personnalisation de la représentation"""
        data = super().to_representation(instance)
        
        
        if instance.formation and instance.formation.justificatif:
            request = self.context.get('request')
            if request:
                data['formation']['justificatif_url'] = request.build_absolute_uri(
                    instance.formation.justificatif.url
                )
        
        return data

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

