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
        # 1. Vérifier le rôle
        if request.user.role != "manager":
            return Response({"error": "Accès refusé"}, status=403)

        # 2. Récupérer l’équipe du manager
        equipes = Equipe.objects.filter(manager=request.user)
        # (un manager peut avoir plusieurs équipes si tu le souhaites)

        # 3. Récupérer les membres de ses équipes
        membres_ids = Utilisateur.objects.filter(equipe__in=equipes).values_list('id', flat=True)

        # 4. Filtrer les demandes en attente des membres
        demandes = DemandeConge.objects.filter(user_id__in=membres_ids, status="en attente")

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