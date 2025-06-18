from rest_framework import generics, permissions
from .models import ReglesGlobaux, DemandeConge, HistoriqueSolde
from .serializers import ReglesGlobauxSerializer
from rest_framework.response import Response 
from rest_framework.views import APIView
from .serializers import DemandeCongeSerializer, HistoriqueSoldeSerializer
from gestionUtilisateurs.models import Utilisateur
from gestionUtilisateurs.serializers import UtilisateurSerializer
from gestionUtilisateurs.models import Equipe
from rest_framework.exceptions import PermissionDenied
import holidays
from django.http import JsonResponse
from datetime import datetime, date
class ReglesGlobauxRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = ReglesGlobaux.objects.all()
    serializer_class = ReglesGlobauxSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        # Toujours retourner la 1re config (ou la crée si absente)
        obj, created = ReglesGlobaux.objects.get_or_create(pk=1)
        return obj
class EmployeDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Solde actuel
        solde = HistoriqueSolde.objects.filter(user=user).order_by('-date_modif').first()
        # Historique des demandes
        demandes = DemandeConge.objects.filter(user=user).order_by('-date_soumission')
        return Response({
            "solde": solde.solde_actuel if solde else 0,
            "demandes": DemandeCongeSerializer(demandes, many=True).data
        })
class DemandeCongeCreateView(generics.CreateAPIView):
    serializer_class = DemandeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        print("\n=== DEBUG ===")
        print("Headers:", request.headers)
        print("User:", request.user)
        print("Data reçue:", request.data)
        print("=== FIN DEBUG ===\n")
        
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print("Erreur lors de la création:", str(e))
            raise

    def perform_create(self, serializer):
        print("User dans perform_create:", self.request.user)
        serializer.save(user=self.request.user)
class ManagerPendingRequestsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Vérifier le rôle
        if request.user.role != "manager":
            return Response({"error": "Accès refusé"}, status=403)

        # Récupérer les équipes dont l'utilisateur est manager
        equipes_manager = Equipe.objects.filter(manager=request.user)
        
        # Récupérer les membres de ces équipes
        membres_ids = Utilisateur.objects.filter(
            equipes_membre__in=equipes_manager
        ).values_list('id', flat=True)

        # Filtrer les demandes en attente avec toutes les informations
        demandes = DemandeConge.objects.filter(
            user_id__in=membres_ids,
            status="en attente"
        ).select_related('user')  # Optimisation pour éviter les requêtes N+1

        # Sérialiser avec plus d'informations
        data = []
        for demande in demandes:
            data.append({
                "id": demande.id,
                "user": f"{demande.user.prenom} {demande.user.nom}",
                "user_id": demande.user.id,
                "type_demande": demande.type_demande,
                "date_debut": demande.date_debut,
                "date_fin": demande.date_fin,
                "status": demande.status,
                "commentaire": demande.commentaire,
                "demi_jour": demande.demi_jour,
                "date_soumission": demande.date_soumission
            })

        return Response(data)

        return Response(DemandeCongeSerializer(demandes, many=True).data)
class DemandeCongeRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DemandeConge.objects.all()
    serializer_class = DemandeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.user != self.request.user:
            raise PermissionDenied("Vous ne pouvez modifier que vos propres demandes")
        if instance.status != 'en attente':
            raise PermissionDenied("Seules les demandes en attente peuvent être modifiées")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres demandes")
        if instance.status != 'en attente':
            raise PermissionDenied("Seules les demandes en attente peuvent être supprimées")
        instance.delete()
class DemandeCongeValidationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, demande_id):
        status = request.data.get("status")  # "validé" ou "refusé"
        commentaire = request.data.get("commentaire")
        try:
            demande = DemandeConge.objects.get(id=demande_id)
        except DemandeConge.DoesNotExist:
            return Response({"error": "Demande introuvable"}, status=404)
        demande.status = status
        demande.commentaire = commentaire
        demande.save()
        return Response({"message": "Statut mis à jour"})
def calculer_conges_acquis(jours_travailles, jours_ouvrables_annuels=230):
    return (jours_travailles * 18) / jours_ouvrables_annuels

# Par défaut : 52 semaines * 5 jours - 18 jours - nb jours fériés
def calculer_jours_ouvrables_annuels(nb_feries=10):
    return (52*5) - 18 - nb_feries
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
import holidays
from datetime import datetime
from django.http import JsonResponse

class HolidayAPIView(APIView):
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        country_code = request.GET.get('country')
        year = request.GET.get('year', datetime.now().year)
        
        if not country_code:
            return JsonResponse({'error': 'Paramètre country requis'}, status=400)
        
        try:
            holidays_list = []
            
            # Ajouter les jours fériés fixes pour les pays spécifiques
            if country_code == 'MA':  # Maroc
                holidays_list.extend([
                    {'date': f'{year}-01-01', 'name': 'Nouvel An', 'fixed': True},
                    {'date': f'{year}-01-11', 'name': "Anniversaire de l'Indépendance", 'fixed': True},
                    {'date': f'{year}-05-01', 'name': "Fête du Travail", 'fixed': True},
                    {'date': f'{year}-07-30', 'name': "Fête du Trône", 'fixed': True},
                    {'date': f'{year}-08-14', 'name': "Commémoration de l'allégeance de l'oued Eddahab", 'fixed': True},
                    {'date': f'{year}-08-20', 'name': "Anniversaire de la révolution, du roi et du peuple", 'fixed': True},
                    {'date': f'{year}-08-21', 'name': "Anniversaire du roi Mohammed VI", 'fixed': True},
                    {'date': f'{year}-11-06', 'name': "Anniversaire de la Marche verte", 'fixed': True},
                    {'date': f'{year}-11-18', 'name': "Fête de l'Indépendance", 'fixed': True}
                ])
            elif country_code == 'DZ':  # Algérie
                holidays_list.extend([
                    {'date': f'{year}-01-01', 'name': "Jour de l'an", 'fixed': True},
                    {'date': f'{year}-01-12', 'name': "Yennayer (Nouvel an berbère)", 'fixed': True},
                    {'date': f'{year}-05-01', 'name': "Fête des travailleurs", 'fixed': True},
                    {'date': f'{year}-07-05', 'name': "Fête de l'indépendance", 'fixed': True},
                    {'date': f'{year}-11-01', 'name': "Fête de la Révolution", 'fixed': True}
                ])
            
            # Ajouter les jours fériés de la bibliothèque holidays
            try:
                if country_code in ['MA', 'DZ', 'TN']:
                    country_holidays = holidays.CountryHoliday(
                        country_code,
                        years=int(year),
                        language='fr'
                    )
                else:
                    country_holidays = holidays.CountryHoliday(country_code, years=int(year))
                
                for date_obj, name in sorted(country_holidays.items()):
                    holiday_date = date_obj.isoformat()
                    # Éviter les doublons
                    if not any(h['date'] == holiday_date for h in holidays_list):
                        holidays_list.append({
                            'date': holiday_date,
                            'name': str(name),
                            'fixed': True
                        })
            except Exception as e:
                # Si la bibliothèque holidays ne supporte pas ce pays, on continue avec nos jours fixes
                pass
            
            return JsonResponse(holidays_list, safe=False)
            
        except Exception as e:
            return JsonResponse({
                'error': f'Erreur avec le pays {country_code}: {str(e)}'
            }, status=400)