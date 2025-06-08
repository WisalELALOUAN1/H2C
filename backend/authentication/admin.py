from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Utilisateur

@admin.register(Utilisateur)
class UtilisateurAdmin(BaseUserAdmin):
    ordering = ('email',)
    list_display = ('email', 'nom', 'prenom', 'role', 'is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Infos perso', {'fields': ('nom', 'prenom', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role', 'nom', 'prenom'),
        }),
    )
    search_fields = ('email', 'nom', 'prenom')
    filter_horizontal = ('groups', 'user_permissions')
