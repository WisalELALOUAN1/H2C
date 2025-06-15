from rest_framework import serializers
from .models import ReglesGlobaux

class ReglesGlobauxSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReglesGlobaux
        fields = '__all__'
