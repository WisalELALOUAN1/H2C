from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, permissions
from .models import Projet,SemaineImputation,ImputationHoraire
from .serializers import ProjetSerializer, SemaineImputationSerializer, ImputationHoraireSerializer,SyntheseMensuelleSerializer,FormationSerializer
from gestionUtilisateurs.models import Equipe
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import status
from rest_framework.views import APIView
from datetime import date, timedelta,timezone
from dateutil import parser
import calendar

class ProjectViewSet(viewsets.ModelViewSet):
    """
    A simple ViewSet for viewing and editing projects.
    """
    queryset = Projet.objects.filter(actif=True)
    serializer_class = ProjetSerializer
    permission_classes= [permissions.IsAuthenticated]
    def get_queryset(self):
        queryset=Projet.objects.filter(actif=True)
        if self.request.user.role=='manager':
            equipes_managed=Equipe.objects.filter(manager=self.request.user)
            queryset=queryset.filter(equipe__in=equipes_managed)
        elif self.request.user.role=='employe':
            equipe=self.request.user.equipe_membres.all()
            queryset=queryset.filter(equipe__in=equipe)
        return queryset
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

class EmployeImputationViewSet(viewsets.ModelViewSet):
    serializer_class = ImputationHoraireSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ImputationHoraire.objects.filter(employe=self.request.user)

    def perform_create(self, serializer):
        serializer.save(employe=self.request.user)

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
        
        # Verifier si la semaine est deja soumise
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
        
        # Valider qu'il y a des imputations
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
        """Synthèse mensuelle des heures par projet"""
        year = request.query_params.get('year', date.today().year)
        month = request.query_params.get('month', date.today().month)
        
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
        for imputation in imputations:
            projet = imputation.projet.nom
            if projet not in synthese:
                synthese[projet] = {
                    'heures': 0,
                    'projet_id': imputation.projet.id,
                    'taux_horaire': imputation.projet.taux_horaire
                }
            synthese[projet]['heures'] += float(imputation.heures)
        
        # Calcul du total et valorisation
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
class ManagerDashboardViewSet(viewsets.ViewSet):
    """
    ViewSet pour le tableau de bord manager avec :
    - Vue consolidée des indicateurs
    - Validation des semaines
    - Génération de rapports
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_managed_teams(self, user):
        """Récupère les équipes gérées par le manager"""
        if user.role != 'manager':
            return Equipe.objects.none()
        return Equipe.objects.filter(manager=user)

    def list(self, request):
        """
        Endpoint: GET /api/manager/dashboard/
        Retourne les données consolidées pour le tableau de bord manager
        """
        managed_teams = self.get_managed_teams(request.user)
        if not managed_teams.exists():
            return Response(
                {'error': 'Vous ne gérez aucune équipe'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Semaines a valider
        weeks_to_validate = SemaineImputation.objects.filter(
            employe__equipes_membre__in=managed_teams,
            statut='soumis'
        ).select_related('employe')

        # Periode courante (semaine en cours)
        today = date.today()
        start_week = today - timedelta(days=today.weekday())
        end_week = start_week + timedelta(days=6)

        # Calcul des indicateurs
        workload_data = self.calculate_workload(managed_teams, start_week, end_week)
        late_projects = self.get_late_projects(managed_teams)

        return Response({
            'semaines_a_valider': SemaineImputationSerializer(weeks_to_validate, many=True).data,
            'charge_par_projet': workload_data['by_project'],
            'charge_par_employe': workload_data['by_employee'],
            'projets_en_retard': late_projects,
            'periode': f"{start_week} - {end_week}",
            'equipes': [{'id': team.id, 'nom': team.nom} for team in managed_teams]
        })

    def calculate_workload(self, teams, start_date, end_date):
        """
        Calcule la charge de travail par projet et par employé
        """
        imputations = ImputationHoraire.objects.filter(
            employe__equipes_membre__in=teams,
            date__range=[start_date, end_date]
        ).select_related('projet', 'employe')

        by_project = {}
        by_employee = {}

        for imp in imputations:
            # Charge par projet
            project_name = imp.projet.nom
            if project_name not in by_project:
                by_project[project_name] = {
                    'heures': 0,
                    'taux': float(imp.projet.taux_horaire),
                    'valeur': 0
                }
            by_project[project_name]['heures'] += float(imp.heures)
            by_project[project_name]['valeur'] += float(imp.heures) * float(imp.projet.taux_horaire)

            # Charge par employe
            employee_name = f"{imp.employe.prenom} {imp.employe.nom}"
            by_employee[employee_name] = by_employee.get(employee_name, 0) + float(imp.heures)

        return {
            'by_project': by_project,
            'by_employee': by_employee
        }

    def get_late_projects(self, teams):
        """Compte les projets en retard pour les équipes gérées"""
        return Projet.objects.filter(
            equipe__in=teams,
            date_fin__lt=date.today(),
            actif=True
        ).count()

    @action(detail=True, methods=['post'], url_path='valider-semaine')
    def validate_week(self, request, pk=None):
        """
        Endpoint: POST /api/manager/dashboard/<id>/valider-semaine/
        Valide ou rejette une semaine d'imputation
        Body: { "action": "valider"|"rejeter", "commentaire": "" }
        """
        week = get_object_or_404(SemaineImputation, pk=pk)
        managed_teams = self.get_managed_teams(request.user)

        # Verification des permissions
        if not managed_teams.filter(membres=week.employe).exists():
            return Response(
                {'error': 'Vous ne gérez pas cet employé'},
                status=status.HTTP_403_FORBIDDEN
            )

        action = request.data.get('action')
        comment = request.data.get('commentaire', '')

        if action not in ['valider', 'rejeter']:
            return Response(
                {'error': 'Action invalide. Doit être "valider" ou "rejeter"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # MAJ du statut
        week.statut = 'valide' if action == 'valider' else 'rejete'
        week.date_validation = timezone.now()
        week.valide_par = request.user
        week.commentaire = comment if action == 'rejeter' else ''
        week.save()

        # Si validation, marquer les imputations comme validees
        if action == 'valider':
            ImputationHoraire.objects.filter(
                employe=week.employe,
                date__week=week.semaine,
                date__year=week.annee
            ).update(valide=True)

        return Response(SemaineImputationSerializer(week).data)

    
    def reporting(self, request):
        """
        Endpoint: GET /api/manager/dashboard/reporting/
        Génère un rapport consolidé avec filtres
        Paramètres:
        - date_debut (YYYY-MM-DD)
        - date_fin (YYYY-MM-DD)
        - projet_id (int)
        - format (json|csv|pdf)
        """
        managed_teams = self.get_managed_teams(request.user)
        if not managed_teams.exists():
            return Response(
                {'error': 'Vous ne gérez aucune équipe'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parametress
        project_id = request.query_params.get('projet_id')
        start_date = request.query_params.get('date_debut')
        end_date = request.query_params.get('date_fin')
        report_format = request.query_params.get('format', 'json')

        # Validation des dates
        try:
            if start_date:
                start_date = parser.parse(start_date).date()
            if end_date:
                end_date = parser.parse(end_date).date()
        except ValueError:
            return Response(
                {'error': 'Format de date invalide. Utiliser YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Construction du queryset de base
        imputations = ImputationHoraire.objects.filter(
            employe__equipes_membre__in=managed_teams
        ).select_related('projet', 'employe')

        # Application des filtres
        if project_id:
            imputations = imputations.filter(projet__id=project_id)
        if start_date and end_date:
            imputations = imputations.filter(date__range=[start_date, end_date])

        # data
        report_data = []
        for imp in imputations:
            report_data.append({
                'date': imp.date.isoformat(),
                'employe': f"{imp.employe.prenom} {imp.employe.nom}",
                'employe_id': imp.employe.id,
                'projet': imp.projet.nom,
                'projet_id': imp.projet.id,
                'heures': float(imp.heures),
                'categorie': imp.categorie,
                'valeur': float(imp.heures) * float(imp.projet.taux_horaire),
                'valide': imp.valide
            })

        # Gestion des differents formats
        if report_format == 'csv':
            return self.generate_csv_report(report_data)
        elif report_format == 'pdf':
            return self.generate_pdf_report(report_data)
        
        # Format JSON par défaut
        return Response({
            'data': report_data,
            'total': len(report_data),
            'periode': f"{start_date} - {end_date}" if start_date and end_date else 'Toutes périodes'
        })

    def generate_csv_report(self, data):
        """Génère un rapport CSV (implémentation simplifiée)"""
        import csv
        from django.http import HttpResponse
        from io import StringIO

        csv_buffer = StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

        response = HttpResponse(csv_buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename=rapport_equipe.csv'
        return response

    def generate_pdf_report(self, data):
        """Genere un rapport PDF (implémentation simplifiee)"""
        from django.http import HttpResponse
        from reportlab.pdfgen import canvas
        from io import BytesIO

        pdf_buffer = BytesIO()
        p = canvas.Canvas(pdf_buffer)

        # En-tete
        p.drawString(100, 800, "Rapport d'activité de l'équipe")
        
        # Contenu
        y_position = 780
        for item in data[:50]:  
            line = f"{item['date']} - {item['employe']}: {item['heures']}h sur {item['projet']}"
            p.drawString(100, y_position, line)
            y_position -= 15
            if y_position < 50:
                p.showPage()
                y_position = 780

        p.save()
        pdf_value = pdf_buffer.getvalue()
        pdf_buffer.close()

        response = HttpResponse(pdf_value, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename=rapport_equipe.pdf'
        return response
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