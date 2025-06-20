from rest_framework import generics, permissions
from .models import ReglesGlobaux, DemandeConge, HistoriqueSolde,Formule, RegleCongé, RegleMembrePersonnalisée
from .serializers import ReglesGlobauxSerializer
from rest_framework.response import Response 
from rest_framework.views import APIView
from rest_framework import status
from rest_framework import viewsets
from rest_framework import serializers
from .serializers import (
    RegleCongeSerializer,
    RegleMembreSerializer,
    FormuleSerializer,
    DemandeCongeSerializer,
    HistoriqueSoldeSerializer
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
import holidays
from datetime import datetime
from django.http import JsonResponse
from gestionUtilisateurs.models import Utilisateur
from gestionUtilisateurs.models import Equipe
from rest_framework.exceptions import PermissionDenied
from gestionUtilisateurs.serializers import EquipeSerializer
import holidays
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from datetime import datetime, date
import json
import requests
import calendar
from .serializers import calculer_conges_acquis
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
        
        demande.save()
        return Response({"message": "Statut mis à jour"})


# Par défaut : 52 semaines * 5 jours - 18 jours - nb jours fériés
def calculer_jours_ouvrables_annuels(nb_feries=10):
    return (52*5) - 18 - nb_feries

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
class EstManagerEquipe(permissions.BasePermission):
    """Permission personnalisée pour vérifier qu'un user est manager d'équipe"""
    def has_permission(self, request, view):
        return request.user.role == 'manager'

class EquipesManagerView(generics.ListAPIView):
    """Liste toutes les équipes dont l'utilisateur est manager"""
    permission_classes = [permissions.IsAuthenticated, EstManagerEquipe]
    serializer_class = EquipeSerializer

    def get_queryset(self):
        return self.request.user.equipes_manager.all()


class RegleMembreViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des règles personnalisées par membre"""
    queryset = RegleMembrePersonnalisée.objects.all()
    serializer_class = RegleMembreSerializer
    permission_classes = [permissions.IsAuthenticated, EstManagerEquipe]

    def get_queryset(self):
        # Filtre par équipes managées par l'utilisateur
        return self.queryset.filter(
            regle_equipe__manager=self.request.user
        )

class FormuleListView(generics.ListCreateAPIView):
    queryset = Formule.objects.filter(publique=True)
    serializer_class = FormuleSerializer
    permission_classes = [permissions.IsAuthenticated]

class DemandeCongeViewSet(viewsets.ModelViewSet):
    """Gestion des demandes de congé"""
    queryset = DemandeConge.objects.all()
    serializer_class = DemandeCongeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Un manager voit les demandes de ses équipes
        if self.request.user.role == 'manager':
            equipes = self.request.user.equipes_manager.all()
            membres_ids = Equipe.objects.filter(
                id__in=equipes.values_list('id', flat=True)
            ).values_list('membres__id', flat=True)
            return self.queryset.filter(user_id__in=membres_ids)
        
        # Un employé ne voit que ses propres demandes
        return self.queryset.filter(user=self.request.user)

class DashboardManagerView(generics.GenericAPIView):
    """Tableau de bord personnalisé pour les managers"""
    permission_classes = [permissions.IsAuthenticated, EstManagerEquipe]

    def get(self, request):
        equipes = request.user.equipes_manager.all()
        
        # Statistiques des équipes
        equipe_stats = []
        for equipe in equipes:
            membres_count = equipe.membres.count()
            demandes_en_attente = DemandeConge.objects.filter(
                user__in=equipe.membres.all(),
                status='en attente'
            ).count()
            
            equipe_stats.append({
                'equipe_id': equipe.id,
                'nom': equipe.nom,
                'membres_count': membres_count,
                'demandes_en_attente': demandes_en_attente
            })
        
        # Récupérer les dernières demandes en attente
        derniers_demandes = DemandeConge.objects.filter(
            user__in=Equipe.objects.filter(
                manager=request.user
            ).values_list('membres__id', flat=True),
            status='en attente'
        ).order_by('-date_soumission')[:5]
        
        return Response({
            'equipes': equipe_stats,
            'dernieres_demandes': DemandeCongeSerializer(derniers_demandes, many=True).data
        })

class ValiderDemandeCongeView(generics.GenericAPIView):
    """Endpoint pour valider/refuser une demande"""
    permission_classes = [permissions.IsAuthenticated, EstManagerEquipe]

    def post(self, request, demande_id):
        demande = get_object_or_404(DemandeConge, id=demande_id)
        
        # Vérifier que le manager gère bien ce membre
        if not request.user.equipes_manager.filter(
            membres__id=demande.user.id
        ).exists():
            return Response(
                {"detail": "Vous n'êtes pas manager de ce membre"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        nouveau_statut = request.data.get('status')
        commentaire = request.data.get('commentaire', '')
        
        if nouveau_statut not in ['validé', 'refusé']:
            return Response(
                {"detail": "Statut invalide"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        demande.status = nouveau_statut
        demande.commentaire = commentaire
        demande.save()
        
        return Response(
            {"detail": f"Demande {nouveau_statut} avec succès"},
            status=status.HTTP_200_OK
        )
class RegleCongeViewSet(viewsets.ModelViewSet):
    queryset = RegleCongé.objects.all()
    serializer_class = RegleCongeSerializer
    permission_classes = [permissions.IsAuthenticated, EstManagerEquipe]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request  # nécessaire pour SerializerMethodField
        return context

    def get_formule(self):
        formule_id = (
            self.request.data.get('formule_defaut') or
            (self.request.data.get('formule_defaut') and self.request.data.get('formule_defaut').get('id'))
        )
        if formule_id:
            return get_object_or_404(Formule, id=formule_id)
        formule = Formule.objects.filter(publique=True).first()
        if not formule:
            raise serializers.ValidationError("Aucune formule publique disponible.")
        return formule

    def calculer_jours_ouvrables(self, jours_acquis_annuels):
        regles = ReglesGlobaux.objects.first()
        if not regles:
            raise serializers.ValidationError("Les règles globales sont introuvables.")
        nb_jours_hebdo = len(regles.jours_ouvrables or [])
        nb_feries = len(regles.jours_feries or [])
        return (52 * nb_jours_hebdo) - nb_feries - jours_acquis_annuels

    def perform_create(self, serializer):
        equipe_id = self.request.data.get('equipe')
        equipe = get_object_or_404(Equipe, id=equipe_id, manager=self.request.user)

        try:
            jours_acquis = int(self.request.data.get('jours_acquis_annuels', 18))
        except (TypeError, ValueError):
            jours_acquis = 18

        jours_ouvrables_annuels = self.calculer_jours_ouvrables(jours_acquis)

        # Calcul dynamique, non stocké
        try:
            jours_travailles = int(self.request.data.get('jours_travailles', 230))
        except (TypeError, ValueError):
            jours_travailles = 230

        # Tu peux utiliser cette valeur si tu souhaites la stocker
        jours_conges_acquis = calculer_conges_acquis(jours_travailles, jours_ouvrables_annuels)

        serializer.save(
            manager=self.request.user,
            equipe=equipe,
            formule_defaut=self.get_formule(),
            jours_acquis_annuels=jours_acquis,
            jours_ouvrables_annuels=jours_ouvrables_annuels,
            # jours_conges_acquis=jours_conges_acquis  # Optionnel si tu as ce champ en base
        )

    def perform_update(self, serializer):
        instance = self.get_object()

        try:
            jours_acquis = int(self.request.data.get('jours_acquis_annuels', instance.jours_acquis_annuels))
        except (TypeError, ValueError):
            jours_acquis = instance.jours_acquis_annuels

        jours_ouvrables_annuels = self.calculer_jours_ouvrables(jours_acquis)

        try:
            jours_travailles = int(self.request.data.get('jours_travailles', 230))
        except (TypeError, ValueError):
            jours_travailles = 230

        jours_conges_acquis = calculer_conges_acquis(jours_travailles, jours_ouvrables_annuels)

        serializer.save(
            formule_defaut=self.get_formule(),
            jours_acquis_annuels=jours_acquis,
            jours_ouvrables_annuels=jours_ouvrables_annuels,
            # jours_conges_acquis=jours_conges_acquis
        )



def eval_expression(expression: str, context: dict):
    try:
        # Attention à la sécurité ! Ne jamais eval avec un input utilisateur non sécurisé en prod
        return eval(expression, {}, context)
    except Exception as e:
        raise ValueError(f"Erreur évaluation expression '{expression}': {e}")

def calculer_jours_par_formule(formule: Formule, context: dict):
    expressions = formule.get_expressions()
    resultats = {}
    for key, expr in expressions.items():
        resultats[key] = eval_expression(expr, context)
    return resultats


class CalendarDataView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        year = int(request.GET.get('year', datetime.now().year))
        month = int(request.GET.get('month', datetime.now().month))
        
        # Calculer les dates de début et fin du mois
        start_date = date(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        end_date = date(year, month, last_day)
        
        # Récupérer les congés de l'utilisateur pour ce mois
        user_leaves = DemandeConge.objects.filter(
            user=request.user,
            date_debut__lte=end_date,
            date_fin__gte=start_date
        ).order_by('date_debut')
        
        # Récupérer les jours fériés
        holidays = self.get_holidays(year, month)
        print(f"Jours fériés pour {year}-{month}: {holidays}")
        # Formater les données
        calendar_data = {
            'holidays': holidays,
            'leaves': [],
            'pendingLeaves': []
        }
        
        # Traiter les congés
        for leave in user_leaves:
            # Générer toutes les dates entre date_debut et date_fin
            current_date = leave.date_debut
            while current_date <= leave.date_fin:
                # Vérifier si la date est dans le mois demandé
                if start_date <= current_date <= end_date:
                    leave_data = {
                        'id': leave.id,
                        'title': f"{leave.get_type_demande_display()}",
                        'date': current_date.isoformat(),
                        'type': 'pending_leave' if leave.status == 'en attente' else 'leave',
                        'status': leave.status,
                        'description': leave.commentaire,
                        'isHalfDay': leave.demi_jour
                    }
                    
                    if leave.status == 'en attente':
                        calendar_data['pendingLeaves'].append(leave_data)
                    else:
                        calendar_data['leaves'].append(leave_data)
                
                # Passer au jour suivant
                current_date = current_date.replace(day=current_date.day + 1) if current_date.day < calendar.monthrange(current_date.year, current_date.month)[1] else current_date.replace(month=current_date.month + 1, day=1) if current_date.month < 12 else current_date.replace(year=current_date.year + 1, month=1, day=1)
                
                if current_date > leave.date_fin:
                    break
        
        return Response(calendar_data)
    
    def get_holidays(self, year, month):
        
        holidays_list = []

        try:
            regles = ReglesGlobaux.objects.first()
            if not regles:
                print("⚠️ Aucune règle globale trouvée.")
                return []

            # 🇺🇳 Étape 1 : essaie d'utiliser la lib holidays avec le pays
            if regles.pays_feries:
                try:
                    country_code = regles.pays_feries
                    if country_code in ['MA', 'DZ', 'TN']:
                        country_holidays = holidays.CountryHoliday(country_code, years=year, language='fr')
                    else:
                        country_holidays = holidays.CountryHoliday(country_code, years=year)

                    for date_obj, name in country_holidays.items():
                        if date_obj.year == year and date_obj.month == month:
                            holidays_list.append({
                                'id': f"holiday_{date_obj}",
                                'title': name,
                                'date': date_obj.isoformat(),
                                'type': 'holiday',
                                'description': name
                            })
                except Exception as e:
                    print(f"❌ Erreur lib holidays : {e}")

            # 🇲🇦 Étape 2 : fallback avec les jours fériés personnalisés
            if regles.jours_feries:
                for ferier in regles.jours_feries:
                    try:
                        # Si dict : {'date': '2024-01-01', 'name': 'Nouvel An'}
                        if isinstance(ferier, dict):
                            raw_date = ferier.get('date')
                            name = ferier.get('name', 'Jour férié')
                            description = ferier.get('description', name)
                        else:
                            raw_date = ferier
                            name = 'Jour férié'
                            description = 'Jour férié défini manuellement'

                        base_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
                        
                        # Remplacer l'année par celle demandée
                        equivalent_date = date(year, base_date.month, base_date.day)

                        if equivalent_date.month == month:
                            holidays_list.append({
                                'id': f"manual_{equivalent_date}",
                                'title': name,
                                'date': equivalent_date.isoformat(),
                                'type': 'holiday',
                                'description': description
                            })

                    except Exception as e:
                        print(f"⚠️ Erreur parsing jour férié: {ferier} — {e}")

            return holidays_list

        except Exception as e:
            print(f"❌ Erreur globale dans get_holidays: {e}")
            return []
