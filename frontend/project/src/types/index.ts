export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'employe';
  nom: string;        
  prenom: string;    
  date_joined: string;
  is_active: boolean;
}

export type LoginResult =
  | { first_login: true; email: string; message: string }
  | { user: User; access: string; refresh: string }
  | string;

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}
export interface WorkDay {
  key: string;   // ex : "lundi"
  label: string; // ex : "Lundi"
}

// Règles globales pour la configuration RH
export interface GlobalRules {
  id?: number; // si tu utilises une clé primaire en BDD
  jours_ouvrables: string[]; // ['lundi', ...]
  jours_feries: CountryHolidays[];
  pays_feries: string | null;
  heure_debut_travail: string; // "09:00"
  heure_fin_travail: string;   // "17:00"
  pause_midi_debut: string;    // "12:00"
  pause_midi_fin: string;      // "13:00"
}

export interface UserFormData {
  username: string;
  email: string;
  prenom: string;
  nom: string;
  role: 'admin' | 'manager' | 'employe';
  password: string;
}
export interface EquipeFormData {
  id: number | null; 
  nom: string;
  description?: string;
  manager: number | "";        // id du manager 
  membres: number[];           // tableau d’ids
  status?: string;
}
export interface Equipe {
  id: number;
  nom: string;
  description: string;
  manager: User | null;
  membres: User[];
  status: string;
  date_creation: string;
}
export interface PendingRequest {
  id: number;
  user: number; // ou objet selon ton serializer
  type_demande: string;
  date_debut: string;
  date_fin: string;
  status: string;
  commentaire: string;
}

export interface LeaveRequest {
  id: number;
  type_demande: string;
  date_debut: string;
  date_fin: string;
  status: string;
  demi_jour: boolean;
  commentaire: string;
  date_soumission: string;
}
export interface Country {
  code: string;
  name: string;
}

export interface CountryHolidays {
  date: string; // Format: YYYY-MM-DD
  name: string;
  fixed: boolean; // Si le jour ferie est fixe ou non
}

export  interface Formule {
  id: number;
  nom_formule: string;
  expression: string;
  publique: boolean;
}
export interface RegleCongé {
  id: number;
  equipe: {
    id: number;
    nom: string;
  };
  manager: {
    id: number;
    email: string;
  };
  formule: Formule;
  
  jours_ouvrables_annuels: number;
  jours_acquis_annuels: number;
  date_mise_a_jour: string;
  jours_conges_acquis: number; 
}
 export interface RegleMembrePersonnalisée {
  id: number;
  membre: {
    id: number;
    prenom: string;
    nom: string;
    email: string;
  };
  regle_equipe?: {
    id: number;
    equipe: number;
    formule: number;
    jours_max: number;
    periode: string;
  };
  formule: Formule;
  jours_max: number;
  periode: 'annuelle' | 'mensuelle' | 'semestrielle' | 'trimestrielle';
  created_at: string;
  updated_at: string;
}
export interface TeamMember {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: string;
}

export interface TeamWithMembers {
  id: number;
  nom: string;
  description: string;
  manager: string;
  membres: TeamMember[];
}

export interface ApiUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role?: string;
}

export interface SoldeHistory {
  id: number;
  user: ApiUser;
  date_modif: string;
  difference: number | null;
  solde_actuel: number;
}

export interface EmployeeCurrentSolde {
  id: number;
  user: ApiUser;
  solde_actuel: number;
  date_modif: string;
  difference: number | null;
  conge_paye: number;
  rtt: number;
  conges_pris_mois: number;
  jours_restants:number;
  jours_acquis_annuels:number;

}

export function mapApiUserToUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    username: apiUser.email.split('@')[0],
    email: apiUser.email,
    role: (apiUser.role as 'admin' | 'manager' | 'employe') || 'employe',
    nom: apiUser.nom,
    prenom: apiUser.prenom,
    date_joined: new Date().toISOString(),
    is_active: true
  };
}
export interface WeeklyImputation {
  imputations: {
    id: string;
    date: string;
    projet: {
      id: string;
      nom: string;
    };
    heures: number;
    categorie: string;
  }[];
  semaine_status: 'brouillon' | 'soumis' | 'valide' | 'rejete';
  dates_semaine: string[];
  commentaire?: string; // Commentaire du manager
}

export interface MonthlySummary {
  synthese: {
    [projet: string]: {
      heures: number;
      projet_id: string;
      taux_horaire: number;
    };
  };
  total_heures: number;
  total_valeur: number;
  periode: string;
}
export interface ReportParams {
  dateDebut?: string;
  dateFin?: string;
  projetId?: string;
  employeId?: string;
  categorie?: 'projet' | 'formation' | 'absence' | 'autre' |'reunion' | 'admin';
  format?: 'json' | 'csv' | 'pdf';
}

export interface ReportData {
  [key: string]: any; // Structure flexible selon le rapport
}
interface WeekToValidate {
  id: number;
  semaine: number;
  annee: number;
  total_heures: number;
  statut: 'brouillon' | 'soumis' | 'valide' | 'rejete';
  employe: {
    id: number;
    prenom: string;
    nom: string;
  };
}

interface ProjectWorkload {
  [key: string]: {
    heures: number;
    taux: number;
    valeur: number;
  };
}

interface EmployeeWorkload {
  [key: string]: number;
}


export interface Projet {
    id: number;
    identifiant: string;
    nom: string;
    description: string;
    date_debut: string;
    date_fin: string;
    taux_horaire: number;
    categorie: 'interne' | 'client' | 'r&d';
    equipe: Equipe;
    actif: boolean;
    created_by?: User;
}

export interface ProjetFormData {
    nom: string;
    description: string;
    date_debut: string;
    date_fin: string;
    taux_horaire: number;
    categorie: 'interne' | 'client' | 'r&d';
    equipe: number | null; // Doit être number ou null, pas boolean
}
export interface TimeEntryData {
  id?: number;
  date: string; // Format: 'YYYY-MM-DD'
  projet: {
    id: number;
    nom: string;
  };
  heures: number;
  categorie: string;
  employe?: {
    id: number;
    nom: string;
    prenom: string;
  };
  valide?: boolean;
}
export interface TimeCategory {
  id: 'projet' | 'formation' | 'absence' | 'autre';
  label: string;
}
export interface CurrentWeekResponse {
  imputations: ReportData[];
  total_heures: number;
  dates_semaine: string[];
  statut: string;
}
export interface WeekImputation {
  id?: number; // Optionnel pour les nouvelles entrées
  date: string;
  projetId: number;
  projet?: Projet; // Optionnel - peut être présent dans la réponse API
  heures: number;
  categorie: string;
  valide?: boolean;
  commentaire?: string;
}
export interface WeekData {
  imputations: WeekImputation[];
  total_heures: number;
  dates_semaine: string[];
  statut: 'brouillon' | 'soumis' | 'valide';
}
// types.ts
export interface ImputationHoraire {
  id: number;
  date: string; // Format: 'YYYY-MM-DD'
  heures: number; // Nombre d'heures (peut être décimal)
  description?: string;
  valide: boolean;
  date_saisie: string; // DateTime ISO
  date_validation?: string; // DateTime ISO
  
  // Catégorie et type d'activité
  categorie: 'projet' | 'formation' | 'absence' | 'autre';
  type_activite?: string; // Plus spécifique que la catégorie
  
  // Relations
  employe: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
  };
  
  projet?: {
    id: number;
    nom: string;
    identifiant: string;
    taux_horaire: number;
    categorie: 'client' | 'interne' | 'r&d';
  };
  
  formation?: {
    id: number;
    intitule: string;
    type: 'interne' | 'externe' | 'autoformation';
  };
  
  valide_par?: {
    id: number;
    nom: string;
    prenom: string;
  };
}

// Interface pour la réponse des imputations journalières
export interface DailyImputationsResponse {
  date: string;
  total_heures: number;
  imputations: ImputationHoraire[];
}

// Interface pour la création/modification
export interface ImputationInput {
  date: string;
  heures: number;
  description?: string;
  categorie: 'projet' | 'formation' | 'absence' | 'autre';
  projet_id?: number;
  formation_id?: number;
  type_activite?: string;
}
export interface Formation {
  id: number;
  intitule: string;
  type_formation: "interne" | "externe" | "autoformation";
  description?: string;
  date_debut: string;   
  date_fin: string;     
  heures: number;       
  employe?: User;
  justificatif?: string; //
}
// Week status
export interface WeekStatus {
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  submittedAt?: string;
  validatedAt?: string;
  validatedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  commentaire?: string; // Commentaire du manager
}
export interface LightProject {
  id: number;
  nom: string;
}
export interface ManagerDashboardData {
  semaines_a_valider: any[];
  charge_par_projet: Record<string, { heures: number; taux: number; valeur: number }>;
  charge_par_categorie: Record<
    'projet' | 'formation' | 'absence' | 'reunion' | 'admin' | 'autre',
    { heures: number; label: string }
  >;
  charge_par_employe: Record<string, number>;
  projets_en_retard: number;
  periode: string;
  equipes: { id: number; nom: string }[];
}