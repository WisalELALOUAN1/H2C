from rest_framework import generics, permissions
from .models import ReglesGlobaux
from .serializers import ReglesGlobauxSerializer

class ReglesGlobauxRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = ReglesGlobaux.objects.all()
    serializer_class = ReglesGlobauxSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        # Toujours retourner la 1re config (ou la crée si absente)
        obj, created = ReglesGlobaux.objects.get_or_create(pk=1)
        return obj
