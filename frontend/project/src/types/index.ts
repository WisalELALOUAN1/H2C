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
  manager: number | "";        // id du manager sélectionné
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
  fixed: boolean; // Si le jour férié est fixe ou non
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