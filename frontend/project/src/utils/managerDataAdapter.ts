import { ManagerDashboardData, ImputationHoraire } from '../types/index';
import { format, startOfWeek, endOfWeek, addDays, getISOWeek, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchManagerWeekEntries } from '../services/api';

interface PDFData {
  weekDates: string;
  totalHours: number;
  workingDays: number;
  totalActivities: number;
  dailyHours: { [date: string]: number };
  projectDistribution: { [project: string]: number };
  categoryDistribution: { [category: string]: number };
  activities: Array<{
    date: string;
    day: string;
    category: string;
    projectOrFormation: string;
    description: string;
    hours: number;
  }>;
}


// Fonction pour mapper les catégories d'imputations aux catégories d'affichage
const mapCategoryToDisplay = (imputation: ImputationHoraire): string => {
  // Si la catégorie est explicitement définie
  if (imputation.categorie) {
    console.log("categorie courante:", imputation.categorie);
    switch (imputation.categorie.toLowerCase()) {
      case 'projet':
        return 'Projet';
      case 'formation':
        return 'Formation';
      case 'absence':
        return 'Absence';
      case 'congé':
      case 'conge':
        return 'Congé';
      case 'réunion':
      case 'reunion':
        return 'Réunion';
      case 'admin':
        return 'Administratif';
      default:
        return imputation.categorie; // Retourne la catégorie originale si reconnue mais non mappée
    }
  }

  // Fallback sur type_activité si la catégorie n'est pas définie
  if (imputation.type_activite) {
    switch (imputation.type_activite.toLowerCase()) {
      case 'formation':
        return 'Formation';
      case 'reunion':
      case 'réunion':
        return 'Réunion';
      case 'admin':
      case 'administratif':
        return 'Administratif';
      // Ajoutez d'autres cas au besoin
    }
  }

  // Fallback final
  return 'Autre';
};

// Fonction pour obtenir le nom du projet ou de la formation
const getProjectOrFormationName = (imputation: ImputationHoraire): string => {
  if (imputation.projet) {
    return imputation.projet.nom;
  }
  if (imputation.formation) {
    return imputation.formation.intitule;
  }
  
  // Pour les autres catégories, utiliser le type d'activité ou la description
  if (imputation.type_activite) {
    switch (imputation.type_activite.toLowerCase()) {
      case 'reunion':
      case 'réunion':
        return 'Réunion';
      case 'admin':
      case 'administratif':
      case 'taches_administratives':
        return 'Tâches administratives';
      default:
        return imputation.type_activite;
    }
  }
  
  // Fallback sur la description ou la catégorie
  return imputation.description || mapCategoryToDisplay(imputation);
};

export const transformWeekDataToPDFFormat = (
  weekData: {
    start_date: string;
    end_date: string;
    imputations: ImputationHoraire[];
    total_heures: number | string; // Accepter number ou string
  } | null,
  employeeName: string
): PDFData | null => {
  if (!weekData) return null;

  const { start_date, end_date, imputations } = weekData;
  
  // Convertir total_heures en number si c'est une string
  const total_heures = typeof weekData.total_heures === 'string' 
    ? parseFloat(weekData.total_heures) 
    : weekData.total_heures;

  // 1. Calcul des heures par jour avec validation
  const dailyHours: Record<string, number> = {};
  imputations.forEach(imp => {
    const dateStr = imp.date.split('T')[0];
    const hours = typeof imp.heures === 'string' ? parseFloat(imp.heures) : imp.heures;
    if (!isNaN(hours)) {
      dailyHours[dateStr] = (dailyHours[dateStr] || 0) + hours;
    }
  });

  // 2. Répartition par catégorie et projet avec validation
  const categoryDistribution: Record<string, number> = {};
  const projectDistribution: Record<string, number> = {};

  imputations.forEach(imp => {
    const hours = typeof imp.heures === 'string' ? parseFloat(imp.heures) : imp.heures;
    if (isNaN(hours)) return;

    const category = mapCategoryToDisplay(imp);
    categoryDistribution[category] = (categoryDistribution[category] || 0) + hours;

    if (imp.projet) {
      projectDistribution[imp.projet.nom] = (projectDistribution[imp.projet.nom] || 0) + hours;
    }
  });

  // 3. Formatage des activités avec validation
  const activities = imputations.map(imp => {
    const hours = typeof imp.heures === 'string' ? parseFloat(imp.heures) : imp.heures;
    return {
      date: imp.date.split('T')[0],
      day: format(new Date(imp.date), 'EEEE', { locale: fr }),
      category: mapCategoryToDisplay(imp),
      projectOrFormation: getProjectOrFormationName(imp),
      description: imp.description || `${mapCategoryToDisplay(imp)} - ${getProjectOrFormationName(imp)}`,
      hours: isNaN(hours) ? 0 : hours // Fournir une valeur par défaut si NaN
    };
  });

  return {
    weekDates: `${format(new Date(start_date), 'dd/MM/yyyy')} - ${format(new Date(end_date), 'dd/MM/yyyy')} - ${employeeName}`,
    totalHours: isNaN(total_heures) ? 0 : total_heures,
    workingDays: Object.keys(dailyHours).length,
    totalActivities: imputations.length,
    dailyHours,
    projectDistribution,
    categoryDistribution,
    activities
  };
};