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
from django.http import HttpResponse
import csv,io
from reportlab.pdfgen import canvas
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Projet.objects.filter(actif=True).select_related('equipe__manager')
        
        if self.request.user.role == 'manager':
            return queryset.filter(equipe__manager=self.request.user)
        elif self.request.user.role == 'employe':
            return queryset.filter(equipe__in=self.request.user.equipe_membres.all())
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
            statut='soumis').distinct
        #Calcul de la charge de l'equipe
        today=date.today()
        date_debut_semaine=today-today.weekday()
        date_fin_semaine=date_debut_semaine+timedelta(days=6)
        imputations=ImputationHoraire.objects.filter(employe__equipes_membre__in=equipes_managed,
            date__range=[date_debut_semaine, date_fin_semaine])
        charge_par_projet = {}
        for imputation in imputations:
            if imputation.projet.nom not in charge_par_projet:
                charge_par_projet[imputation.projet.nom] = 0
            charge_par_projet[imputation.projet.nom] += float(imputation.heures)
        
        serializer = SemaineImputationSerializer(semaines_a_valider, many=True)
        return Response({
            'semaines': serializer.data,
            'charge_par_projet': charge_par_projet,
        })
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


        fmt = request.query_params.get("format", "json").lower()

        if fmt == "csv":
            return self._csv_response(flat_imputations_for_export)

        if fmt == "pdf":
            return self._pdf_response(flat_imputations_for_export)

        
        return Response(payload, status=status.HTTP_200_OK)

   
    def _csv_response(self, rows):
        """Génère un CSV en mémoire et le renvoie."""
        if not rows:
            return Response({"detail": "Aucune donnée"}, status=204)

        header = rows[0].keys()
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)

        resp = HttpResponse(buf.getvalue(), content_type="text/csv")
        resp[
            "Content-Disposition"
        ] = f'attachment; filename="imputations_soumis_{date.today()}.csv"'
        return resp

    def _pdf_response(self, rows):
        """PDF simple : une ligne = une imputation (à styliser côté front si besoin)."""
        if not rows:
            return Response({"detail": "Aucune donnée"}, status=204)

        buf = io.BytesIO()
        p = canvas.Canvas(buf)
        y = 800
        p.setFont("Helvetica", 10)

        for row in rows:
            line = (
                f'{row["date"]}  |  {row["employe"]:<25}  |  '
                f'{row["projet"] or row["formation"] or row["categorie"]:<20}  |  '
                f'{row["heures"]}h'
            )
            p.drawString(40, y, line)
            y -= 12
            if y < 40:
                p.showPage()
                y = 800

        p.save()
        pdf = buf.getvalue()
        buf.close()

        resp = HttpResponse(pdf, content_type="application/pdf")
        resp[
            "Content-Disposition"
        ] = f'attachment; filename="imputations_soumis_{date.today()}.pdf"'
        return resp
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
            ]
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
            heures = float(imp.heures)

            #employe
            emp = f"{imp.employe.prenom} {imp.employe.nom}"
            by_employee[emp] = by_employee.get(emp, 0) + heures

            # projet ou catégorie
            if imp.categorie == "projet" and imp.projet:
                p_name = imp.projet.nom
                if p_name not in by_project:
                    by_project[p_name] = {
                        "heures": 0,
                        "taux"  : float(imp.projet.taux_horaire),
                        "valeur": 0
                    }
                by_project[p_name]["heures"] += heures
                by_project[p_name]["valeur"] += heures * float(imp.projet.taux_horaire)
            else:
                cat = imp.categorie
                by_category[cat] = by_category.get(cat, 0) + heures

        return {
            "by_project" : by_project,
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
        week.commentaire    = comment if action == "rejeter" else ""
        week.save()

        # marquer imputations validees
        if action == "valider":
            (ImputationHoraire.objects
             .filter(employe=week.employe, date__week=week.semaine, date__year=week.annee)
             .update(valide=True))

        return Response(SemaineImputationSerializer(week).data)

   
    def reporting(self, request):
        teams = self._managed_teams(request.user)
        if not teams.exists():
            return Response(
                {"error": "Vous ne gérez aucune équipe"},
                status=status.HTTP_400_BAD_REQUEST
            )

        project_id   = request.query_params.get("projet_id")
        start_date_q = request.query_params.get("date_debut")
        end_date_q   = request.query_params.get("date_fin")
        fmt          = request.query_params.get("format", "json")

        try:
            start = parser.parse(start_date_q).date() if start_date_q else None
            end   = parser.parse(end_date_q).date()   if end_date_q   else None
        except ValueError:
            return Response({"error": "Format de date invalide (YYYY-MM-DD)"},
                            status=status.HTTP_400_BAD_REQUEST)

        qs = (
            ImputationHoraire.objects
            .filter(employe__equipes_membre__in=teams)
            .select_related("projet", "employe")
        )
        if project_id:
            qs = qs.filter(projet__id=project_id)
        if start and end:
            qs = qs.filter(date__range=[start, end])

        data = [{
            "date"      : imp.date.isoformat(),
            "employe"   : f"{imp.employe.prenom} {imp.employe.nom}",
            "employe_id": imp.employe.id,
            "projet"    : imp.projet.nom if imp.projet else None,
            "projet_id" : imp.projet.id  if imp.projet else None,
            "categorie" : imp.categorie,
            "heures"    : float(imp.heures),
            "valeur"    : (float(imp.heures) * float(imp.projet.taux_horaire)
                           if imp.categorie == "projet" and imp.projet else 0),
            "valide"    : imp.valide,
        } for imp in qs]

        if fmt == "csv":
            return self._csv(data)
        if fmt == "pdf":
            return self._pdf(data)

        return Response({
            "data"   : data,
            "total"  : len(data),
            "periode": f"{start} - {end}" if start and end else "Toutes périodes",
        })

    
    def _csv(self, data):
        import csv
        from io import StringIO
        from django.http import HttpResponse

        buff   = StringIO()
        writer = csv.DictWriter(buff, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

        resp = HttpResponse(buff.getvalue(), content_type="text/csv")
        resp["Content-Disposition"] = "attachment; filename=rapport_equipe.csv"
        return resp

    def _pdf(self, data):
        from io import BytesIO
        from django.http import HttpResponse
        from reportlab.pdfgen import canvas

        buff = BytesIO()
        c    = canvas.Canvas(buff)
        c.drawString(50, 800, "Rapport d'activité équipe (extrait)")

        y = 780
        for line in data[:60]:                    
            txt = f"{line['date']} - {line['employe']} : {line['heures']}h ({line['categorie']})"
            c.drawString(50, y, txt)
            y -= 14
            if y < 50:
                c.showPage()
                y = 800

        c.save()
        pdf = buff.getvalue()
        buff.close()

        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = "attachment; filename=rapport_equipe.pdf"
        return resp
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