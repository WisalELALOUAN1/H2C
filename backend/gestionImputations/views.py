from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, permissions
from .models import Projet,SemaineImputation,ImputationHoraire,Formation
from .serializers import ProjetSerializer, SemaineImputationSerializer, ImputationHoraireSerializer,SyntheseMensuelleSerializer,FormationSerializer
from gestionUtilisateurs.models import Equipe
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import status
from rest_framework.views import APIView
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from datetime import date, timedelta
from django.utils import timezone  
from datetime import datetime
from gestionUtilisateurs.serializers import EquipeSerializer
from dateutil import parser
import calendar
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.db import IntegrityError
from gestionUtilisateurs.serializers import UtilisateurSerializer
from django.db.models import Sum    

import logging
logger = logging.getLogger(__name__)
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Projet.objects.filter(actif=True).select_related('equipe__manager')
        
        if self.request.user.role == 'manager':
            return queryset.filter(equipe__manager=self.request.user)
        elif self.request.user.role == 'employe':
            return queryset.filter(equipe__in=self.request.user.equipes_membre.all())
        print (queryset)
        return queryset

    def perform_create(self, serializer):
        equipe_id = self.request.data.get('equipe')
        
        if not equipe_id and self.request.user.role == 'manager':
          
            equipe = self.request.user.equipe_manager.first()
            if not equipe:
                raise PermissionDenied("Vous n'êtes manager d'aucune équipe")
            serializer.save(equipe=equipe)
        else:
            # Validation pour les autres cas
            if equipe_id:
                equipe = serializer.validated_data.get('equipe')
                if self.request.user.role == 'manager' and equipe.manager != self.request.user:
                    raise PermissionDenied("Vous ne gérez pas cette équipe")
            serializer.save()
    @action(detail=False, methods=['get'])
    def equipes_disponibles(self, request):
        """
        Retourne les équipes disponibles pour l'utilisateur connecté
        """
        user = request.user
        
        if user.role == 'admin':
            equipes = Equipe.objects.all()
        elif user.role == 'manager':
            equipes = Equipe.objects.filter(manager=user)
        elif user.role == 'employe':
            equipes = request.user.equipe_membres.all()
        else:
            equipes = Equipe.objects.none()
        
        serializer = EquipeSerializer(equipes, many=True)
        return Response(serializer.data)
class ManagerImputationViewSet(viewsets.ModelViewSet):
    """
    A simple ViewSet for viewing and editing manager imputations.
    """
    permission_classes = [permissions.IsAuthenticated]
    def list(self, request):
        if request.user.role != 'manager':
            return Response({'detail': 'Permission denied.'}, status=403)
        equipes_managed = Equipe.objects.filter(manager=request.user)
        semaines_a_valider=SemaineImputation.objects.filter(employe__equipes_membre__in=equipes_managed,
            statut='soumis').distinct()
        #Calcul de la charge de l'equipe
        today=date.today()
        date_debut_semaine = today - timedelta(days=today.weekday()) ##test
        date_fin_semaine = date_debut_semaine + timedelta(days=6) ##test
        imputations=ImputationHoraire.objects.filter(employe__equipes_membre__in=equipes_managed,
            date__range=[date_debut_semaine, date_fin_semaine])
        charge_par_projet = {}
        for imputation in imputations:
            projet_nom = imputation.projet.nom if imputation.projet else "Sans projet"
            if projet_nom not in charge_par_projet:
                charge_par_projet[projet_nom] = 0
            charge_par_projet[projet_nom] += float(imputation.heures)
        
        serializer = SemaineImputationSerializer(semaines_a_valider, many=True)
        data = serializer.data
        for idx, semaine_obj in enumerate(semaines_a_valider):
            data[idx]['employe_id']  = semaine_obj.employe.id
            data[idx]['employe_nom'] = f"{semaine_obj.employe.prenom} {semaine_obj.employe.nom}"
            print("-----------data__---",data)
        return Response({
            'semaines': data,
            'charge_par_projet': charge_par_projet,
        })
    @action(detail=False, methods=['get'], url_path='employe/(?P<employee_id>\d+)/semaine/(?P<year>\d+)/(?P<week>\d+)/entries')
    def employee_week_entries(self, request, employee_id=None, year=None, week=None):
        """
        Récupère les imputations d'un employé pour une semaine spécifique
        """
        try:
            # Conversion des paramètres
            employee_id = int(employee_id)
            year = int(year)
            week = int(week)
            
            # Vérification que l'employé appartient aux équipes du manager
            if not Equipe.objects.filter(
                manager=request.user,
                membres__id=employee_id
            ).exists():
                return Response(
                    {"detail": "Accès non autorisé à cet employé"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Calcul des dates ISO
            try:
                start_date = date.fromisocalendar(year, week, 1)
                end_date = start_date + timedelta(days=6)
            except ValueError as e:
                return Response(
                    {"error": f"Semaine invalide: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Récupération des imputations
            imputations = ImputationHoraire.objects.filter(
                employe_id=employee_id,
                date__range=(start_date, end_date)
            ).select_related("projet", "formation")

            # Sérialisation
            serializer = ImputationHoraireSerializer(imputations, many=True)
            total_heures = imputations.aggregate(total=Sum('heures'))['total'] or 0

            return Response({
                "success": True,
                "employee_id": employee_id,
                "year": year,
                "week": week,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "imputations": serializer.data,
                "total_heures": float(total_heures)
            })

        except Exception as e:
            logger.error(f"Erreur dans employee_week_entries: {str(e)}", exc_info=True)
            return Response(
                {"error": "Une erreur interne est survenue"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class ManagerSubmittedImputationsView(APIView):
   

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "manager":
            return Response(
                {"detail": "Accès réservé aux managers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        
        teams = Equipe.objects.filter(manager=request.user)
        today = date.today()
        iso_week, iso_year = today.isocalendar()[:2]
       
        weeks = (
            SemaineImputation.objects.filter(
                employe__equipes_membre__in=teams,
                statut="soumis",
                semaine=iso_week,
                annee=iso_year
            )
            .distinct()
            .select_related("employe")
            
        )

   
        payload = []
        flat_imputations_for_export = []  # servira pour CSV/PDF
        for week in weeks:
            imputs = (
                ImputationHoraire.objects.filter(
                    employe=week.employe,
                    date__week=week.semaine,
                    date__year=week.annee,
                )
                .select_related("projet", "formation")
            )

            ser_week = SemaineImputationSerializer(week).data
            ser_emp = UtilisateurSerializer(week.employe).data
            ser_imputs = ImputationHoraireSerializer(imputs, many=True).data

            # total heures  de la semaine
            total = imputs.aggregate(h=Sum("heures"))["h"] or 0

            payload.append(
                {
                    "semaine": ser_week,
                    "employe": ser_emp,
                    "total_heures": total,
                    "imputations": ser_imputs,
                }
            )

            for imp in ser_imputs:
                flat_imputations_for_export.append(
                    {
                        "semaine": week.semaine,
                        "annee": week.annee,
                        "employe": f'{ser_emp["prenom"]} {ser_emp["nom"]}',
                        "date": imp["date"],
                        "projet": imp["projet_nom"] or "",
                        "formation": imp["formation_nom"] or "",
                        "categorie": imp["categorie"],
                        "heures": imp["heures"],
                        "description": imp["description"],
                    }
                )


        

        
        return Response(payload, status=status.HTTP_200_OK)

   
    
class FormationViewSet(viewsets.ModelViewSet):
    queryset = Formation.objects.all()
    serializer_class = FormationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
  
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Formation.objects.filter(employe=self.request.user).order_by('-date_debut')

    def perform_create(self, serializer):
        serializer.save(employe=self.request.user)
class EmployeImputationViewSet(viewsets.ModelViewSet):
    serializer_class = ImputationHoraireSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ImputationHoraire.objects.filter(employe=self.request.user)

    def perform_create(self, serializer):
        serializer.save(employe=self.request.user)
    @action(detail=False, methods=['get'], url_path='formations_employe')
    def formations_employe(self, request):
        """
        Retourne toutes les formations que l’utilisateur a déjà enregistrées.
        Pas de pagination : la liste sert juste à pré-remplir un select.
        """
        formations = (
            Formation.objects
            .filter(employe=request.user)
            .values(                
                'id',
                'intitule',
                'type_formation',
                'date_debut',
                'date_fin',
                'heures'
            )
            .order_by('-date_fin')
        )
        return Response(list(formations))
    @action(detail=False, methods=['get'], url_path='projets_employe')
    def projets_employe(self, request):
        """
        Liste les projets rattachés aux équipes dont l’utilisateur est membre.
        - Filtre uniquement les projets « actifs ».
        - Renvoie id, nom, identifiant, taux_horaire, categorie.
        """
        projets_qs = (
            Projet.objects
            .filter(equipe__membres=request.user, actif=True)
            .values(
                'id',
                'nom',
                'identifiant',
                'taux_horaire',
                'categorie'
            )
            .distinct()
        )

        return Response(list(projets_qs))

    @action(detail=False, methods=['get'])
    def semaine_courante(self, request):
        """Récupère les imputations pour la semaine courante"""
        today = date.today()
        year, week, _ = today.isocalendar()
        
        start_date = date.fromisocalendar(year, week, 1)
        end_date = start_date + timedelta(days=6)
        
        imputations = self.get_queryset().filter(
            date__range=[start_date, end_date]
        )
        
       
        semaine_imputation = SemaineImputation.objects.filter(
            employe=request.user,
            semaine=week,
            annee=year
        ).first()
        
        serializer = self.get_serializer(imputations, many=True)
        return Response({
        'imputations': serializer.data,
        'semaine_status': semaine_imputation.statut if semaine_imputation else 'brouillon',
        'dates_semaine': [
            (start_date + timedelta(days=i)).isoformat() 
            for i in range(7)
        ],
        'commentaire': semaine_imputation.commentaire if semaine_imputation else ''
    })

    @action(detail=False, methods=['post'])
    def soumettre_semaine(self, request):
        """Soumet la semaine courante pour validation"""
        today = date.today()
        year, week, _ = today.isocalendar()
        
        semaine, created = SemaineImputation.objects.get_or_create(
            employe=request.user,
            semaine=week,
            annee=year,
            defaults={'statut': 'brouillon'}
        )
        
        if semaine.statut != 'brouillon':
            return Response(
                {'error': 'Cette semaine a déjà été soumise'},
                status=status.HTTP_400_BAD_REQUEST
            )
     
        start_date = date.fromisocalendar(year, week, 1)
        end_date = start_date + timedelta(days=6)
        
        if not self.get_queryset().filter(date__range=[start_date, end_date]).exists():
            return Response(
                {'error': 'Aucune imputation pour cette semaine'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        semaine.statut = 'soumis'
        semaine.date_soumission = timezone.now()
        semaine.save()
        
        return Response({'status': 'soumis'})

    @action(detail=False, methods=['get'])
    def historique(self, request):
        """Historique des imputations avec filtres"""
        projets = request.query_params.getlist('projet')
        date_debut = request.query_params.get('date_debut')
        date_fin = request.query_params.get('date_fin')
        
        queryset = self.get_queryset()
        
        if projets:
            queryset = queryset.filter(projet__id__in=projets)
        
        if date_debut and date_fin:
            try:
                date_debut = parser.parse(date_debut).date()
                date_fin = parser.parse(date_fin).date()
                queryset = queryset.filter(date__range=[date_debut, date_fin])
            except ValueError:
                return Response(
                    {'error': 'Format de date invalide'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = self.get_serializer(queryset.order_by('-date'), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def synthese_mensuelle(self, request):
    
        year = request.query_params.get('year', date.today().year)
        month = request.query_params.get('month', date.today().month)
        print(f"Year: {year}, Month: {month}")  
        
        try:
            year = int(year)
            month = int(month)
        except ValueError:
            return Response(
                {'error': 'Year et month doivent être des nombres'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        _, last_day = calendar.monthrange(year, month)
        date_debut = date(year, month, 1)
        date_fin = date(year, month, last_day)
        
        imputations = self.get_queryset().filter(
            date__range=[date_debut, date_fin]
        ).select_related('projet')
        
        synthese = {}
        autres_activites = {
            'heures': 0,
            'projet_id': None,
            'taux_horaire': 0
        }
        
        for imputation in imputations:
            if imputation.projet:
                projet_nom = imputation.projet.nom
                if projet_nom not in synthese:
                    synthese[projet_nom] = {
                        'heures': 0,
                        'projet_id': imputation.projet.id,
                        'taux_horaire': float(imputation.projet.taux_horaire)
                    }
                synthese[projet_nom]['heures'] += float(imputation.heures)
            else:
                autres_activites['heures'] += float(imputation.heures)
        
       
        if autres_activites['heures'] > 0:
            synthese['Autres activités'] = autres_activites
        
        
        total_heures = sum(item['heures'] for item in synthese.values())
        total_valeur = sum(
            item['heures'] * item['taux_horaire'] 
            for item in synthese.values()
        )
        
        return Response({
            'synthese': synthese,
            'total_heures': total_heures,
            'total_valeur': total_valeur,
            'periode': f"{date_debut} - {date_fin}"
        })
CATEGORY_LABELS = {
    "projet"   : "Projets",
    "formation": "Formation",
    "absence"  : "Absence",
    "reunion"  : "Réunion",
    "admin"    : "Administratif",
    "autre"    : "Autre activité",
}
class ManagerDashboardViewSet(viewsets.ViewSet):
    """
    Tableau de bord Manager
    -----------------------
    • Vue consolidée (charges + indicateurs)
    • Validation des semaines
    • Génération de rapports
    """
    
    permission_classes = [permissions.IsAuthenticated]

  
    def _managed_teams(self, user):
        """Toutes les équipes gérées par le manager connecté"""
        return Equipe.objects.filter(manager=user) if user.role == "manager" else Equipe.objects.none()

   
    def list(self, request):
        teams = self._managed_teams(request.user)
        if not teams.exists():
            return Response(
                {"error": "Vous ne gérez aucune équipe"},
                status=status.HTTP_400_BAD_REQUEST
            )

        week_ids = (
        SemaineImputation.objects
        .filter(employe__equipes_membre__in=teams, statut="soumis")
        .values_list("id", flat=True)      
        .distinct()
    )
        weeks = (
            SemaineImputation.objects
            .filter(employe__equipes_membre__in=teams, statut="soumis")
            .filter(id__in=week_ids) 
            .select_related("employe")
            
        )

        today       = date.today()
        monday      = today - timedelta(days=today.weekday())
        sunday      = monday + timedelta(days=6)
        workload    = self._calculate_workload(teams, monday, sunday)
        late_number = self._late_projects(teams)
        CATEGORY_LABELS = {
            "projet"   : "Projets",
            "formation": "Formation",
            "absence"  : "Absence",
            "reunion"  : "Réunion",
            "admin"    : "Administratif",
            "autre"    : "Autre activité",
        }
        return Response({
            "semaines_a_valider"  : SemaineImputationSerializer(weeks, many=True).data,
            "charge_par_projet"   : workload["by_project"],
            "charge_par_categorie": {
                cat: {"heures": h, "label": CATEGORY_LABELS.get(cat, cat.capitalize())}
                for cat, h in workload["by_category"].items()
            },
            "charge_par_employe"  : workload["by_employee"],
            "projets_en_retard"   : late_number,
            "periode"             : f"{monday} - {sunday}",
            "equipes"             : [{"id": t.id, "nom": t.nom} for t in teams],
        })

   
    def _calculate_workload(self, teams, start_date, end_date):
        qs = (
            ImputationHoraire.objects
            .filter(employe__equipes_membre__in=teams,
                    date__range=[start_date, end_date])
            .select_related("projet", "employe")
        )

        by_project, by_category, by_employee = {}, {}, {}

        for imp in qs:
            h = float(imp.heures)

            emp_name = f"{imp.employe.prenom} {imp.employe.nom}"
            by_employee[emp_name] = by_employee.get(emp_name, 0) + h

            if imp.categorie == "projet" and imp.projet:
                p = imp.projet.nom
                if p not in by_project:
                    by_project[p] = {
                        "heures": 0,
                        "taux": float(imp.projet.taux_horaire),
                        "valeur": 0
                    }
                by_project[p]["heures"] += h
                by_project[p]["valeur"] += h * float(imp.projet.taux_horaire)
                by_category["projet"] = by_category.get("projet", 0) + h
            else:
                cat = imp.categorie
                by_category[cat] = by_category.get(cat, 0) + h

        return {
            "by_project": by_project,
            "by_category": by_category,
            "by_employee": by_employee,
        }


    # indicateur  de retard
    def _late_projects(self, teams):
        return Projet.objects.filter(
            equipe__in=teams,
            date_fin__lt=date.today(),
            actif=True
        ).count()

    @action(detail=False, methods=["get"], url_path="projets")
    def projets(self, request):
        """
        GET /gestion-imputations-projet/manager/projets/

        ↳ Renvoie la liste minimale des projets (id, nom)
          rattachés aux équipes gérées par le manager connecté.
        """
        teams = self._managed_teams(request.user)

        # Aucun projet si le user n’est pas manager ou ne gère aucune équipe
        if not teams.exists():
            return Response([], status=200)

        projets = (
            Projet.objects
            .filter(equipe__in=teams)
            .values("id", "nom")      # ⚑ juste les champs utiles
            .distinct()
            .order_by("nom")
        )

        return Response(list(projets), status=200)
    
    
    @action(detail=True, methods=["post"], url_path="valider-semaine")
    def validate_week(self, request, pk=None):
        week = get_object_or_404(SemaineImputation, pk=pk)
        if not self._managed_teams(request.user).filter(membres=week.employe).exists():
            return Response({"error": "Vous ne gérez pas cet employé"},
                            status=status.HTTP_403_FORBIDDEN)

        action   = request.data.get("action")
        comment  = request.data.get("commentaire", "")
        if action not in {"valider", "rejeter"}:
            return Response({"error": 'Action invalide : "valider" ou "rejeter"'},
                            status=status.HTTP_400_BAD_REQUEST)

        week.statut         = "valide" if action == "valider" else "rejete"
        week.date_validation = timezone.now()
        week.valide_par     = request.user
        print(f"Commentaire: {comment}")
        week.commentaire    = comment 
        week.save()

        # marquer imputations validees
        if action == "valider":
            (ImputationHoraire.objects
             .filter(employe=week.employe, date__week=week.semaine, date__year=week.annee)
             .update(valide=True))

        return Response(SemaineImputationSerializer(week).data)

class SemaineCouranteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            today = date.today()
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
            
            imputations = ImputationHoraire.objects.filter(
                employe=request.user,
                date__range=[start_date, end_date]
            ).select_related('projet')
            
            total_heures = sum(float(imp.heures) for imp in imputations)
            
            return Response({
                'imputations': [
                    {
                        'id': imp.id,
                        'date': imp.date.isoformat(),
                        'projet': {
                            'id': imp.projet.id,
                            'nom': imp.projet.nom
                        },
                        'heures': float(imp.heures),
                        'categorie': imp.categorie
                    } for imp in imputations
                ],
                'total_heures': total_heures,
                'dates_semaine': [
                    (start_date + timedelta(days=i)).isoformat()
                    for i in range(7)
                ],
                'statut': 'brouillon'
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SyntheseMensuelleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            year = int(request.GET.get('year', date.today().year))
            month = int(request.GET.get('month', date.today().month))
            
            start_date = date(year, month, 1)
            end_date = date(year, month, calendar.monthrange(year, month)[1])
            
            imputations = ImputationHoraire.objects.filter(
                employe=request.user,
                date__range=[start_date, end_date]
            ).select_related('projet')
            
            synthese = {}
            total_heures = 0
            total_valeur = 0
            
            for imp in imputations:
                projet = imp.projet.nom
                if projet not in synthese:
                    synthese[projet] = {
                        'heures': 0,
                        'taux': float(imp.projet.taux_horaire),
                        'valeur': 0
                    }
                synthese[projet]['heures'] += float(imp.heures)
                synthese[projet]['valeur'] += float(imp.heures) * float(imp.projet.taux_horaire)
                total_heures += float(imp.heures)
                total_valeur += float(imp.heures) * float(imp.projet.taux_horaire)
            
            return Response({
                'synthese': synthese,
                'total_heures': total_heures,
                'total_valeur': total_valeur,
                'periode': {
                    'debut': start_date.isoformat(),
                    'fin': end_date.isoformat()
                }
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class DailyImputationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]

    # ---------------------------------------------------------------------- GET
    def get(self, request, date=None):
        """Récupère les imputations d’une date"""
        try:
            target_date = (
                datetime.strptime(date, "%Y-%m-%d").date()
                if date else timezone.now().date()
            )
        except ValueError:
            return Response({"error": "Format de date invalide"}, status=400)

        imputations = (
            ImputationHoraire.objects
            .filter(employe=request.user, date=target_date)
            .select_related("projet", "formation")
        )

        ser = ImputationHoraireSerializer(imputations, many=True)
        return Response({
            "date": target_date.strftime("%Y-%m-%d"),
            "imputations": ser.data,
            "total_heures": sum(float(i.heures) for i in imputations),
        })

    
    def post(self, request):
        """Création d’une imputation"""
        data = request.data.copy()

        # Assigner employe_id
        data["employe_id"] = request.user.id

        # Mapper objet → *_id
        if isinstance(data.get("projet"), dict):
            data["projet_id"] = data.pop("projet")["id"]
        if isinstance(data.get("formation"), dict):
            data["formation_id"] = data.pop("formation")["id"]

        # Validation des heures
        try:
            h = float(data.get("heures", 0))
            if h <= 0 or h > 24:
                return Response({"heures": "0 < heures ≤ 24"}, status=400)
        except (ValueError, TypeError):
            return Response({"heures": "Valeur d'heures invalide"}, status=400)

        # Exclusivite projet / formation
        cat = data.get("categorie")
        if cat == "projet":
            data.pop("formation_id", None)
        elif cat == "formation":
            data.pop("projet_id", None)
        else:
            data.pop("projet_id", None)
            data.pop("formation_id", None)

       
        ser = ImputationHoraireSerializer(data=data, context={'request': request})
        if not ser.is_valid():
            return Response(ser.errors, status=400)

        
        try:
            imputation = ser.save()
        except IntegrityError as e:
            # Contrainte unique sur (employe, date, projet, heures, description)
            return Response(
                {"non_field_errors": ["Cette imputation existe déjà pour ce projet/date/heures/description."]},
                status=400
            )

        # 201
        out_ser = ImputationHoraireSerializer(imputation)
        return Response(out_ser.data, status=status.HTTP_201_CREATED)

    
    def patch(self, request, id=None):
        """Mise à jour partielle d’une imputation"""
        try:
            imp = ImputationHoraire.objects.get(pk=id, employe=request.user)
        except ImputationHoraire.DoesNotExist:
            return Response({"error": "Imputation non trouvée"}, status=404)

        data = request.data.copy()

      
        if isinstance(data.get("projet"), dict):
            data["projet_id"] = data.pop("projet")["id"]
        if isinstance(data.get("formation"), dict):
            data["formation_id"] = data.pop("formation")["id"]

        
        cat = data.get("categorie")
        if cat == "projet":
            data.pop("formation_id", None)
            setattr(imp, "formation", None)
        elif cat == "formation":
            data.pop("projet_id", None)
            setattr(imp, "projet", None)
        else:
            data.pop("projet_id", None)
            data.pop("formation_id", None)
            setattr(imp, "projet", None)
            setattr(imp, "formation", None)

        ser = ImputationHoraireSerializer(
            imp, data=data, partial=True, context={'request': request}
        )
        if not ser.is_valid():
            print("[PATCH ERROR]", ser.errors)
            return Response(ser.errors, status=400)

        try:
            updated = ser.save()
        except IntegrityError:
            return Response(
                {"non_field_errors": ["Mise à jour violerait une imputation existante (unicité)."]},
                status=400
            )

        out_ser = ImputationHoraireSerializer(updated)
        return Response(out_ser.data)
    def delete(self, request, id=None):
        """Suppression d'une imputation"""
        try:
            imp = ImputationHoraire.objects.get(pk=id, employe=request.user)
        except ImputationHoraire.DoesNotExist:
            return Response({"error": "Imputation non trouvée"}, status=404)
        imp.delete()
        return Response({"status": "deleted"}, status=204)
