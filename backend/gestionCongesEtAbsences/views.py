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
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
import holidays
from datetime import datetime
from django.http import JsonResponse
from gestionUtilisateurs.models import Utilisateur
from authentication.serializers import UtilisateurSerializer
from gestionUtilisateurs.models import Equipe
from rest_framework.exceptions import PermissionDenied
from gestionUtilisateurs.serializers import EquipeSerializer
import holidays
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from datetime import datetime, date
import calendar
from rest_framework import permissions
from datetime import datetime, date, timedelta
import logging
from rest_framework.views import APIView
from rest_framework import permissions, status
from rest_framework.response import Response
from django.db.models import Q, Prefetch
from django.db.models import Window,F
from django.db.models.functions import Lag
import traceback
from .serializers import calculer_conges_acquis
class ReglesGlobauxRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = ReglesGlobaux.objects.all()
    serializer_class = ReglesGlobauxSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        # Toujours retourner la 1re config (ou la crée si absente)
        obj, created = ReglesGlobaux.objects.get_or_create(pk=1)
        return obj



def get_jours_utilises_pour_annee(user, annee):
    debut_annee = date(annee, 1, 1)
    fin_annee = date(annee, 12, 31)

    conges_valides = DemandeConge.objects.filter(
        user=user,
        status='validé',
        date_fin__gte=debut_annee,
        date_debut__lte=fin_annee
    )

    jours_utilises = 0
    for conge in conges_valides:
        # Découper la portion de congé qui tombe sur l’année courante
        date_debut = max(conge.date_debut, debut_annee)
        date_fin = min(conge.date_fin, fin_annee)
        nb_jours = (date_fin - date_debut).days + 1
        if conge.demi_jour:
            nb_jours -= 0.5
        jours_utilises += nb_jours

    return jours_utilises
class EmployeDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        annee_courante = date.today().year
        # Récupérer les équipes auxquelles il appartient
        equipes = user.equipes_membre.all()
        
        regle = None
        if equipes.exists():
            regle = RegleCongé.objects.filter(equipe__in=equipes).first()

        if regle:
            jours_acquis_annuels = regle.jours_acquis_annuels
            print("DEBUG: Jours acquis annuels:", jours_acquis_annuels)
            jours_ouvrables_annuels = regle.jours_ouvrables_annuels
            jours_max_negatif = regle.nbr_max_negatif
        else:
            jours_acquis_annuels = 18
            jours_ouvrables_annuels = 230
            jours_max_negatif = 0

        # Congés validés
        conges_valides = DemandeConge.objects.filter(user=user, status='validé',date_fin__gte=date(annee_courante, 1, 1),date_debut__lte=date(annee_courante, 12, 31))
        def calcul_jours_utilises_annee(conges, annee):
            jours_utilises = 0
            debut_annee = date(annee, 1, 1)
            fin_annee = date(annee, 12, 31)
            for c in conges:
                debut = max(c.date_debut, debut_annee)
                fin = min(c.date_fin, fin_annee)
                jours = (fin - debut).days + 1
                if c.demi_jour:
                    jours -= 0.5
                jours_utilises += jours
            return jours_utilises
        total_utilise = calcul_jours_utilises_annee(conges_valides, annee_courante)


        # Solde dynamique
        solde_calcule = round((jours_acquis_annuels * 1.0) - total_utilise, 2)
        print("max jours negatifs:", jours_max_negatif)
        return Response({
            "solde": solde_calcule,
            "max_negatif": jours_max_negatif,
            "demandes": DemandeCongeSerializer(
                DemandeConge.objects.filter(user=user).order_by('-date_soumission'),
                many=True
            ).data
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
        self.mettre_a_jour_solde(demande)
        demande.save()
        return Response({"message": "Statut mis à jour"})
    def mettre_a_jour_solde(self, demande):
       

        annee_courante = date.today().year
        debut = max(demande.date_debut, date(annee_courante, 1, 1))
        fin = min(demande.date_fin, date(annee_courante, 12, 31))

        jours_conges = (fin - debut).days + 1
        if demande.demi_jour and demande.date_debut == demande.date_fin:
            jours_conges = 0.5

        # Dernier solde enregistré
        dernier_historique = HistoriqueSolde.objects.filter(user=demande.user).order_by('-date_modif').first()
        
        if dernier_historique:
            nouveau_solde = dernier_historique.solde_actuel - jours_conges
        else:
            regle = RegleCongé.objects.filter(equipe__membres=demande.user).first()
            jours_acquis = regle.jours_acquis_annuels if regle else 18
            nouveau_solde = jours_acquis - jours_conges

        HistoriqueSolde.objects.create(
            user=demande.user,
            solde_actuel=nouveau_solde,
            date_modif=date.today()
        )

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
        nbr_max_negatif = self.request.data.get('nbr_max_negatif', 0)
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
            nbr_max_negatif=nbr_max_negatif,
            # jours_conges_acquis=jours_conges_acquis  # Optionnel si tu as ce champ en base
        )

    def perform_update(self, serializer):
        instance = self.get_object()

        try:
            jours_acquis = int(self.request.data.get('jours_acquis_annuels', instance.jours_acquis_annuels))
        except (TypeError, ValueError):
            jours_acquis = instance.jours_acquis_annuels

        jours_ouvrables_annuels = self.calculer_jours_ouvrables(jours_acquis)
        nbr_max_negatif = self.request.data.get('nbr_max_negatif', serializer.instance.nbr_max_negatif)

        try:
            jours_travailles = int(self.request.data.get('jours_travailles', 230))
        except (TypeError, ValueError):
            jours_travailles = 230

        jours_conges_acquis = calculer_conges_acquis(jours_travailles, jours_ouvrables_annuels)
        print("nbr max négatif:", nbr_max_negatif)
        serializer.save(
            formule_defaut=self.get_formule(),
            jours_acquis_annuels=jours_acquis,
            jours_ouvrables_annuels=jours_ouvrables_annuels,
            nbr_max_negatif=nbr_max_negatif,
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




logger = logging.getLogger(__name__)

class CalendarDataView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            # 1. Valider les paramètres de requête
            year = int(request.GET.get('year', datetime.now().year))
            month = int(request.GET.get('month', datetime.now().month))
            
            if not (1 <= month <= 12):
                raise ValueError("Le mois doit être entre 1 et 12")
            
            # 2. Calculer la période
            start_date = date(year, month, 1)
            last_day = calendar.monthrange(year, month)[1]
            end_date = date(year, month, last_day)
            
            logger.info(f"Fetching calendar data for user {request.user.id} - {year}-{month}")

            # 3. Récupérer les congés de l'utilisateur
            user_leaves = DemandeConge.objects.filter(
                user=request.user,
                date_debut__lte=end_date,
                date_fin__gte=start_date
            ).select_related('user').order_by('date_debut')

            # 4. Récupérer les congés de l'équipe (méthode optimisée)
            team_leaves = DemandeConge.objects.none()  # Par défaut vide
            
            # Vérifier d'abord si l'utilisateur appartient à des équipes
            user_teams = request.user.equipes_membre.all()
            if user_teams.exists():
                team_members = Utilisateur.objects.filter(
                    equipes_membre__in=user_teams
                ).exclude(id=request.user.id).distinct()

                team_leaves = DemandeConge.objects.filter(
                    Q(user__in=team_members),
                    Q(date_debut__lte=end_date),
                    Q(date_fin__gte=start_date)
                ).select_related('user').order_by('date_debut')

            logger.info(f"Found {user_leaves.count()} user leaves and {team_leaves.count()} team leaves")

            # 5. Récupérer les jours fériés
            holidays_data = self.get_holidays(year, month)
            
            # 6. Formater la réponse
            def build_leave_data(leave, is_team=False):
                leave_days = []
                current_date = max(leave.date_debut, start_date)
                end_date_leave = min(leave.date_fin, end_date)
                
                while current_date <= end_date_leave:
                    leave_data = {
                        'id': leave.id,
                        'title': leave.get_type_demande_display(),
                        'date': current_date.isoformat(),
                        'type': 'pending_leave' if leave.status == 'en attente' else 'leave',
                        'status': leave.status,
                        'description': leave.commentaire or "",
                        'isHalfDay': leave.demi_jour,
                        'isTeamLeave': is_team,
                    }
                    
                    if is_team:
                        leave_data['user'] = {
                            'id': leave.user.id,
                            'name': f"{leave.user.prenom} {leave.user.nom}",
                            'email': leave.user.email
                        }
                    
                    leave_days.append(leave_data)
                    current_date += timedelta(days=1)
                
                return leave_days

            # Séparer les congés validés/en attente
            approved_leaves = []
            pending_leaves = []
            
            for leave in user_leaves:
                if leave.status == 'en attente':
                    pending_leaves.extend(build_leave_data(leave))
                else:
                    approved_leaves.extend(build_leave_data(leave))
            
            # Congés de l'équipe
            team_leave_days = []
            for leave in team_leaves:
                team_leave_days.extend(build_leave_data(leave, True))

            response_data = {
                'holidays': holidays_data,
                'leaves': approved_leaves,
                'pendingLeaves': pending_leaves,
                'teamLeaves': team_leave_days,
                'meta': {
                    'user_id': request.user.id,
                    'period': f"{year}-{month:02d}",
                    'generated_at': datetime.now().isoformat()
                }
            }

            return Response(response_data)

        except ValueError as ve:
            logger.error(f"Validation error: {ve}")
            return Response(
                {"error": str(ve)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}\n{traceback.format_exc()}")
            return Response(
                {"error": "Une erreur technique est survenue"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_holidays(self, year, month):
        holidays_list = []
        try:
            regles = ReglesGlobaux.objects.first()
            if not regles:
                logger.warning("Aucune règle globale trouvée")
                return holidays_list

            # Jours fériés du pays
            if regles.pays_feries:
                try:
                    country_holidays = holidays.CountryHoliday(
                        regles.pays_feries,
                        years=year,
                        language='fr' if regles.pays_feries in ['MA', 'DZ', 'TN'] else None
                    )
                    
                    for date_obj, name in country_holidays.items():
                        if date_obj.year == year and date_obj.month == month:
                            holidays_list.append({
                                'id': f"holiday_{date_obj}",
                                'title': name,
                                'date': date_obj.isoformat(),
                                'type': 'holiday',
                                'description': name,
                                'isCustom': False
                            })
                except Exception as e:
                    logger.error(f"Erreur avec la lib holidays: {e}")

            # Jours fériés personnalisés
            if regles.jours_feries:
                for ferier in regles.jours_feries:
                    try:
                        if isinstance(ferier, dict):
                            date_str = ferier.get('date')
                            name = ferier.get('name', 'Jour férié')
                            desc = ferier.get('description', name)
                        else:
                            date_str = ferier
                            name = 'Jour férié'
                            desc = 'Jour férié défini manuellement'

                        if date_str:
                            ferier_date = date.fromisoformat(date_str)
                            equivalent_date = ferier_date.replace(year=year)
                            
                            if equivalent_date.month == month:
                                holidays_list.append({
                                    'id': f"custom_{equivalent_date}",
                                    'title': name,
                                    'date': equivalent_date.isoformat(),
                                    'type': 'holiday',
                                    'description': desc,
                                    'isCustom': True
                                })
                    except Exception as e:
                        logger.error(f"Erreur traitement jour férié {ferier}: {e}")

        except Exception as e:
            logger.error(f"Erreur dans get_holidays: {e}")
        
        return holidays_list


class AdminUserSoldeHistoryView(generics.ListAPIView):
    serializer_class = HistoriqueSoldeSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return HistoriqueSolde.objects.filter(
            user_id=user_id
        ).annotate(
            solde_precedent=Window(
                expression=Lag('solde_actuel'),
                order_by=F('date_modif').asc()
            ),
            difference=F('solde_actuel') - F('solde_precedent')
        ).order_by('-date_modif')
class AdminCurrentSoldesView(APIView):
    """Liste des soldes actuels de tous les employés"""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        users = Utilisateur.objects.filter(
            role='employe'
        ).prefetch_related('historiquesolde_set')
        
        data = []
        for user in users:
            last_solde = user.historiquesolde_set.order_by('-date_modif').first()
            data.append({
                'user': {
                    'id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email
                },
                'current_solde': last_solde.solde_actuel if last_solde else 0,
                'last_update': last_solde.date_modif if last_solde else None
            })
    
class AdminCurrentSoldesView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        users = Utilisateur.objects.filter(
            role='employe'
        ).prefetch_related(
            Prefetch('historiquesolde_set', queryset=HistoriqueSolde.objects.order_by('-date_modif')))
        
        data = []
        for user in users:
            last_solde = user.historiquesolde_set.first()  # Le plus récent
            data.append({
                'user': UtilisateurSerializer(user).data,
                'current_solde': last_solde.solde_actuel if last_solde else 0,
                'last_update': last_solde.date_modif if last_solde else None
            })
        print ("DEBUG: Current soldes data:", data)
        return Response(data)
class AdminHistoriqueSoldeView(generics.ListAPIView):
    """
    Vue API pour récupérer l'historique des soldes de tous les employés.
    """
    serializer_class = HistoriqueSoldeSerializer

    def get_queryset(self):
        print("DEBUG: Récupération de l'historique de solde pour tous les employés")
        return HistoriqueSolde.objects.all().order_by('-date_modif')
    
    