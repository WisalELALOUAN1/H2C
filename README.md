#  H2C - Plateforme RH : Gestion Congés, Imputations, Formations

Bienvenue sur H2C, une application web complète de gestion des ressources humaines (absences, congés, imputations horaires, équipes ...).

Ce projet comprend :
- **Un backend** Django + Django REST Framework
- **Un frontend** React (Vite + TypeScript)
- Architecture modulaire et prête pour la production.

---

##  Structure du projet

```bash
H2C/
├── backend/               # API Django REST Framework
│   ├── apps/
│   │   ├── authentication/  # Authentification
│   │   ├── gestionCongesEtAbsence/   # Module congés
│   │   ├── gestionImputations/ # Module imputations
│   │   └── gestionUtilisateurs/  #  Module de gestion des utilisateurs/equipes
│   ├── manage.py
│   └── .env
│
└── frontend/              # Application React (Vite + TypeScript)
    ├── src/
    │   ├── api/           # Services API
    │   ├── components/    # Composants UI
    │   ├── contexts/      # Contextes React
    │   ├── pages/         # Pages de l'application
    │   ├── types/         # Types TypeScript
    │   └── services/         # Connexion avec le backend
    ├── public/
    ├── package.json
    └── vite.config.ts

```



# Installation & Lancement local:





1. Cloner le projet

git clone https://github.com/WisalELALOUAN1/H2C


cd H2C

2. Préparer le Backend (Django)

cd backend


python manage.py runserver
Le backend est accessible sur : http://localhost:8000

3. Préparer le Frontend (React)

cd ../frontend

## Installer les dépendances
npm install

## Lancer le serveur de développement
npm run dev

Le frontend est accessible sur : http://localhost:5173

#  URLs Utiles
API Admin Django : http://localhost:8000/admin/

Docs Swagger API : http://localhost:8000/api/docs/

Frontend React : http://localhost:5173


#  Détail technique
Backend
Python 3.12+

Django 5+

DRF (Django REST Framework)

Authentification sécurisée par token/session

Gestion : Utilisateurs, Imputations, Projets, Formations, Absences/Présences

Swagger docs générées automatiquement

Frontend
Node JS v20.12.2
npm 10.5.0



UI moderne : Tailwind, shadcn, lucide-react

Auth/Context, API centralisée (src/services/api.ts)

Composants modulaires : Dashboard, Formulaires, Synthèse mensuelle, etc.


Déploiement (prod) : à faire via Docker

Base de données : par défaut SQLite, mais prêt pour Postgres/MySQL

Tests : Django (backend), React Testing Library (frontend)








 
