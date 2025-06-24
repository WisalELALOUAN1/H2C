from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, permissions
from .models import Projet,SemaineImputation,ImputationHoraire
from .serializers import ProjetSerializer, SemaineImputationSerializer, ImputationHoraireSerializer,SyntheseMensuelleSerializer,FormationSerializer
from gestionUtilisateurs.models import Equipe
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from datetime import date, timedelta,timezone
from dateutil import parser
import calendar

class ProjectViewSet(viewsets.ModelViewSet):
    """
    A simple ViewSet for viewing and editing projects.
    """
    queryset = Projet.objects.all(actif=True)
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
        semaines_a_valider=SemaineImputation.objects.filter(employe__equipes_appartenance__in=equipes_managed,
            statut='soumis').distinct
        #Calcul de la charge de l'equipe
        today=date.today()
        date_debut_semaine=today-today.weekday()
        date_fin_semaine=date_debut_semaine+timedelta(days=6)
        imputations=ImputationHoraire.objects.filter(employe__equipes_appartenance__in=equipes_managed,
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
        
        # Vérifier si la semaine est déjà soumise
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
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """Tableau de bord manager avec vue consolidée"""
        if request.user.role != 'manager':
            return Response(
                {'error': 'Accès réservé aux managers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Récupérer les équipes gérées
        equipes = Equipe.objects.filter(manager=request.user)
        
        if not equipes.exists():
            return Response(
                {'error': 'Vous ne gérez aucune équipe'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Semaines à valider
        semaines_a_valider = SemaineImputation.objects.filter(
            employe__equipes_appartenance__in=equipes,
            statut='soumis'
        ).select_related('employe')
        
        # Calcul des indicateurs
        today = date.today()
        date_debut_semaine = today - timedelta(days=today.weekday())
        date_fin_semaine = date_debut_semaine + timedelta(days=6)
        
        # Charge par projet
        imputations = ImputationHoraire.objects.filter(
            employe__equipes_appartenance__in=equipes,
            date__range=[date_debut_semaine, date_fin_semaine]
        ).select_related('projet', 'employe')
        
        charge_par_projet = {}
        charge_par_employe = {}
        
        for imputation in imputations:
            # Par projet
            projet = imputation.projet.nom
            if projet not in charge_par_projet:
                charge_par_projet[projet] = {
                    'heures': 0,
                    'taux': imputation.projet.taux_horaire,
                    'valeur': 0
                }
            charge_par_projet[projet]['heures'] += float(imputation.heures)
            charge_par_projet[projet]['valeur'] += float(imputation.heures) * imputation.projet.taux_horaire
            
            # Par employé
            employe = f"{imputation.employe.prenom} {imputation.employe.nom}"
            if employe not in charge_par_employe:
                charge_par_employe[employe] = 0
            charge_par_employe[employe] += float(imputation.heures)
        
        # Projets en retard
        projets_en_retard = Projet.objects.filter(
            equipe__in=equipes,
            date_fin__lt=today,
            actif=True
        ).count()
        
        return Response({
            'semaines_a_valider': SemaineImputationSerializer(semaines_a_valider, many=True).data,
            'charge_par_projet': charge_par_projet,
            'charge_par_employe': charge_par_employe,
            'projets_en_retard': projets_en_retard,
            'periode': f"{date_debut_semaine} - {date_fin_semaine}"
        })

    @action(detail=True, methods=['post'])
    def valider_semaine(self, request, pk=None):
        """Valider ou rejeter une semaine d'imputation"""
        semaine = get_object_or_404(SemaineImputation, pk=pk)
        
        # Vérifier que le manager gère bien cet employé
        if not Equipe.objects.filter(
            manager=request.user,
            membres=semaine.employe
        ).exists():
            return Response(
                {'error': 'Vous ne gérez pas cet employé'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        action = request.data.get('action')
        commentaire = request.data.get('commentaire', '')
        
        if action == 'valider':
            semaine.statut = 'valide'
            semaine.date_validation = timezone.now()
            semaine.valide_par = request.user
            
            # Valider toutes les imputations de la semaine
            ImputationHoraire.objects.filter(
                employe=semaine.employe,
                date__week=semaine.semaine,
                date__year=semaine.annee
            ).update(valide=True)
            
        elif action == 'rejeter':
            semaine.statut = 'rejete'
            semaine.date_validation = timezone.now()
            semaine.valide_par = request.user
            semaine.commentaire = commentaire
        else:
            return Response(
                {'error': 'Action invalide. Doit être "valider" ou "rejeter"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        semaine.save()
        return Response(SemaineImputationSerializer(semaine).data)

    @action(detail=False, methods=['get'])
    def reporting(self, request):
        """Génération de rapports"""
        equipes = Equipe.objects.filter(manager=request.user)
        
        # Filtres
        projet_id = request.query_params.get('projet')
        date_debut = request.query_params.get('date_debut')
        date_fin = request.query_params.get('date_fin')
        format = request.query_params.get('format', 'json')
        
        # Validation des dates
        try:
            if date_debut:
                date_debut = parser.parse(date_debut).date()
            if date_fin:
                date_fin = parser.parse(date_fin).date()
        except ValueError:
            return Response(
                {'error': 'Format de date invalide. Utiliser YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Construction du queryset
        imputations = ImputationHoraire.objects.filter(
            employe__equipes_appartenance__in=equipes
        ).select_related('projet', 'employe')
        
        if projet_id:
            imputations = imputations.filter(projet__id=projet_id)
        
        if date_debut and date_fin:
            imputations = imputations.filter(date__range=[date_debut, date_fin])
        
        # Agrégation des données
        data = []
        for imputation in imputations:
            data.append({
                'date': imputation.date,
                'employe': f"{imputation.employe.prenom} {imputation.employe.nom}",
                'projet': imputation.projet.nom,
                'heures': float(imputation.heures),
                'categorie': imputation.categorie,
                'valeur': float(imputation.heures) * imputation.projet.taux_horaire
            })
        
        if format == 'csv':
            # Implémenter la génération CSV ici
            pass
        elif format == 'pdf':
            # Implémenter la génération PDF ici
            pass
        
        return Response(data)