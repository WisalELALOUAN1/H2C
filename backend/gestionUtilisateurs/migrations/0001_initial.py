# Generated by Django 5.2 on 2025-06-16 18:15

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Equipe",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nom", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                ("date_creation", models.DateField(auto_now_add=True)),
                ("status", models.CharField(default="active", max_length=30)),
                (
                    "manager",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="equipes_manager",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "membres",
                    models.ManyToManyField(
                        related_name="equipes_membre", to=settings.AUTH_USER_MODEL
                    ),
                ),
            ],
        ),
    ]
