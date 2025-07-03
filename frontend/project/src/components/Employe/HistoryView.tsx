import React, { useEffect, useState } from "react";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Briefcase,
  BookOpen,
  Coffee,
  UserX,
  Settings,
  Clock,
  Calendar,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  Copy,
  MapPin,
  User,
  FileText,
  Timer,
  Upload,
  X,
} from "lucide-react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  fetchGlobalRulesApi,
  fetchDailyImputations,
  createImputation,
  updateImputation,
  deleteImputation,
  fetchEmployeeProjectsApi,
  fetchEmployeeTrainings,
  createFormation
} from "../../services/api";
import type {
  GlobalRules,
  ImputationHoraire,
  Projet,
  Formation
} from "../../types";
import { useAuth } from "../../contexts/AuthContext";

interface ActivityType {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const activityTypes: ActivityType[] = [
  
  {
    id: "reunion",
    label: "Réunion",
    icon: Coffee,
    color: "orange",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
  },
  {
    id: "absence",
    label: "Absence",
    icon: UserX,
    color: "red",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
  },
  {
    id: "admin",
    label: "Tâches administratives",
    icon: Settings,
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
  },
  {
    id: "projet",
    label: "Travail sur projet",
    icon: Briefcase,
    color: "amber",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
  },
  {
    id: "formation",
    label: "Formation",
    icon: BookOpen,
    color: "emerald",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
  }
];

const getFormationTypeLabel = (type: string): string => {
  const labels = {
    'interne': 'Formation Interne',
    'externe': 'Formation Externe', 
    'autoformation': 'Autoformation'
  };
  return labels[type as keyof typeof labels] || type;
};

const getFormationTypeBadgeColor = (type: string): string => {
  const colors = {
    'interne': 'bg-blue-100 text-blue-700',
    'externe': 'bg-purple-100 text-purple-700',
    'autoformation': 'bg-green-100 text-green-700'
  };
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
};

interface NewFormationFormProps {
  onSave: (formation: Partial<Formation>) => Promise<Formation>;
  onCancel: () => void;
  loading?: boolean;
}

const NewFormationForm: React.FC<NewFormationFormProps> = ({
  onSave,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<Partial<Formation>>({
    intitule: '',
    type_formation: 'interne',
    description: '',
    date_debut: format(new Date(), 'yyyy-MM-dd'),
    date_fin: format(new Date(), 'yyyy-MM-dd'),
    heures: 1,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.MouseEvent | React.KeyboardEvent) => {
    console.log('NewFormationForm: Form submitted');
    
    //fixed 
    e.preventDefault();
    e.stopPropagation();
    
    console.log('NewFormationForm: Default prevented, processing form');
    console.log('Form data:', formData);
    
    if (!isFormValid()) {
      console.log('NewFormationForm: Form is not valid');
      return;
    }

    setSaving(true);
    try {
      console.log('NewFormationForm: Calling onSave with data:', formData);
      const result = await onSave(formData);
      console.log('NewFormationForm: Formation created successfully:', result);
    } catch (error) {
      console.error('NewFormationForm: Error creating formation:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && isFormValid()) {
      handleSubmit(e);
    }
  };

  const updateField = (field: keyof Formation, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    const valid = !!(
      formData.intitule?.trim() && 
      formData.date_debut && 
      formData.date_fin && 
      formData.heures && 
      formData.heures > 0
    );
    console.log('Form validation result:', valid, formData);
    return valid;
  };

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-emerald-800 flex items-center">
          <BookOpen className="w-4 h-4 mr-2" />
          Créer une nouvelle formation
        </h4>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
          className="p-1 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3" onKeyDown={handleKeyDown}>
       
        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-1">
            Intitulé de la formation *
          </label>
          <input
            type="text"
            value={formData.intitule || ''}
            onChange={(e) => updateField('intitule', e.target.value)}
            className="w-full text-sm border border-emerald-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
            placeholder="Ex: Formation React avancé"
            required
          />
        </div>

        
        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-1">
            Type de formation *
          </label>
          <select
            value={formData.type_formation || 'interne'}
            onChange={(e) => updateField('type_formation', e.target.value)}
            className="w-full text-sm border border-emerald-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
          >
            <option value="interne">Formation Interne</option>
            <option value="externe">Formation Externe</option>
            <option value="autoformation">Autoformation</option>
          </select>
        </div>

       
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Date début *
            </label>
            <input
              type="date"
              value={formData.date_debut || ''}
              onChange={(e) => updateField('date_debut', e.target.value)}
              className="w-full text-sm border border-emerald-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Date fin *
            </label>
            <input
              type="date"
              value={formData.date_fin || ''}
              onChange={(e) => updateField('date_fin', e.target.value)}
              min={formData.date_debut}
              className="w-full text-sm border border-emerald-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-1">
              Heures totales *
            </label>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={formData.heures || 1}
              onChange={(e) => updateField('heures', parseFloat(e.target.value) || 1)}
              className="w-full text-sm border border-emerald-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
              required
            />
          </div>
        </div>

        
        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full text-sm border border-emerald-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors resize-none"
            rows={2}
            placeholder="Description optionnelle de la formation..."
          />
        </div>

        
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="px-4 py-2 text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !isFormValid()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Création...' : 'Créer la formation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface FormationSelectProps {
  formations: Formation[];
  selectedFormationId?: number;
  onSelect: (formation: Formation | undefined) => void;
  loading: boolean;
  required?: boolean;
  onCreateNew?: () => void;
}

const FormationSelect: React.FC<FormationSelectProps> = ({
  formations,
  selectedFormationId,
  onSelect,
  loading,
  required = false,
  onCreateNew
}) => {
  const selectedFormation = formations.find(f => f.id === selectedFormationId);

  if (loading) {
    return (
      <div className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 flex items-center">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-gray-500">Chargement des formations...</span>
      </div>
    );
  }

  // Model de creation d une formation  si aucune formation disponible
  if (formations.length === 0) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-amber-700">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Aucune formation disponible</span>
            </div>
          </div>
          <p className="text-sm text-amber-600 mt-1">
            Vous devez d'abord créer une formation pour pouvoir l'imputer.
          </p>
          {onCreateNew && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCreateNew();
              }}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une formation</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={selectedFormationId || ""}
          onChange={(e) => {
            const selected = formations.find(f => f.id === parseInt(e.target.value));
            onSelect(selected);
          }}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors"
          required={required}
        >
          <option value="">Sélectionner une formation</option>
          {formations.map((formation) => (
            <option key={formation.id} value={formation.id}>
              {formation.intitule} • {getFormationTypeLabel(formation.type_formation)} • {formation.heures}h
            </option>
          ))}
        </select>
        
        {onCreateNew && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCreateNew();
            }}
            className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors flex items-center"
            title="Créer une nouvelle formation"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedFormation && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-emerald-800">{selectedFormation.intitule}</h4>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getFormationTypeBadgeColor(selectedFormation.type_formation)}`}>
              {getFormationTypeLabel(selectedFormation.type_formation)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center text-emerald-600">
              <Calendar className="w-4 h-4 mr-1" />
              <span>
                {format(new Date(selectedFormation.date_debut), 'dd/MM/yyyy')} - {format(new Date(selectedFormation.date_fin), 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="flex items-center text-emerald-600">
              <Timer className="w-4 h-4 mr-1" />
              <span>{selectedFormation.heures}h au total</span>
            </div>
          </div>

          {selectedFormation.description && (
            <div className="mt-2 pt-2 border-t border-emerald-200">
              <div className="flex items-start text-sm text-emerald-700">
                <FileText className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                <span>{selectedFormation.description}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface NewActivityFormProps {
  date: string;
  onSave: (activity: Partial<ImputationHoraire>) => Promise<void>;
  onCancel: () => void;
  activityTypes: ActivityType[];
  formId: string;
  projects: Projet[];
  formations: Formation[];
  loadingProjects: boolean;
  loadingFormations: boolean;
  onFormationCreated: (formation: Formation) => void;
}

const NewActivityForm: React.FC<NewActivityFormProps> = ({
  date,
  onSave,
  onCancel,
  activityTypes,
  projects,
  formations,
  loadingProjects,
  loadingFormations,
  onFormationCreated,
}) => {
  const [activity, setActivity] = useState<Partial<ImputationHoraire>>({
    date,
    heures: 0,
    categorie: "projet",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [showNewFormationForm, setShowNewFormationForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSaving(true);
    try {
      await onSave(activity);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFormation = async (data: Partial<Formation>): Promise<Formation> => {
    console.log('NewActivityForm: Creating formation with data:', data);
    
    try {
      
      const formData = new FormData();
      formData.append("intitule", data.intitule!);
      formData.append("type_formation", data.type_formation!);
      formData.append("description", data.description || "");
      formData.append("date_debut", data.date_debut!);
      formData.append("date_fin", data.date_fin!);
      formData.append("heures", String(data.heures!));
      if (typeof data.justificatif === "string") {
        formData.append("justificatif", data.justificatif);
      }

      
      
      
      const newFormation = await createFormation(formData);
      
      console.log('NewActivityForm: Formation created:', newFormation);

     
      const formationForImputation = {
        id: newFormation.id,
        intitule: newFormation.intitule,
        type: newFormation.type_formation as "interne"|"externe"|"autoformation",
      };

       
      setActivity(prev => ({
        ...prev,
        formation: formationForImputation
      }));

      
      onFormationCreated(newFormation);
      
      
      setShowNewFormationForm(false);

      return newFormation;
    } catch (error) {
      console.error('NewActivityForm: Error creating formation:', error);
      throw error;
    }
  };

  const selectedActivityType =
    activityTypes.find((t) => t.id === activity.categorie) || activityTypes[0];
  const Icon = selectedActivityType.icon;

  const updateField = (field: keyof ImputationHoraire, value: any) =>
    setActivity((prev) => ({ ...prev, [field]: value }));

  const isFormValid = () => {
    if (activity.categorie === "projet" && !activity.projet?.id) return false;
    if (activity.categorie === "formation" && !activity.formation?.id) return false;
    return true;
  };

  return (
    <div className="p-4 rounded-xl shadow-sm border-l-4 border-amber-200 bg-white mt-4">
      <form onSubmit={handleSubmit}>
       
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${selectedActivityType.bgColor}`}>
              <Icon className={`w-5 h-5 ${selectedActivityType.textColor}`} />
            </div>
            
            <select
              value={activity.categorie}
              onChange={(e) =>
                setActivity({
                  ...activity,
                  categorie: e.target.value as ImputationHoraire["categorie"],
                  
                  projet: undefined,
                  formation: undefined,
                })
              }
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
            >
              {activityTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-lg">
              Modifiable
            </span>
          </div>
          <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        
        <textarea
          value={activity.description || ""}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Description de l'activité..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors resize-none"
          rows={2}
          required
        />

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
         
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heures</label>
            <input
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={activity.heures || 0}
              onChange={(e) => updateField("heures", parseFloat(e.target.value) || 0)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
              required
            />
          </div>

          
          {activity.categorie === "projet" && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Projet</label>
              {loadingProjects ? (
                <div className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-gray-500">Chargement des projets...</span>
                </div>
              ) : (
                <select
                  value={activity.projet?.id || ""}
                  onChange={(e) => {
                    const selectedProject = projects.find(p => p.id === parseInt(e.target.value));
                    updateField("projet", selectedProject || undefined);
                  }}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                  required
                >
                  <option value="">Sélectionner un projet</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.identifiant ? `[${project.identifiant}] ` : ''}{project.nom}
                    </option>
                  ))}
                </select>
              )}
              {!loadingProjects && projects.length === 0 && (
                <div className="text-sm text-amber-600 mt-1">
                  Aucun projet disponible
                </div>
              )}
            </div>
          )}

         
          {activity.categorie === "formation" && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Formation</label>
              
              {showNewFormationForm ? (
                <NewFormationForm
                  onSave={handleCreateFormation}
                  onCancel={() => setShowNewFormationForm(false)}
                />
              ) : (
                <FormationSelect
                  formations={formations}
                  selectedFormationId={activity.formation?.id}
                  onSelect={(formation) => updateField("formation", formation)}
                  loading={loadingFormations}
                  required
                  onCreateNew={() => setShowNewFormationForm(true)}
                />
              )}
            </div>
          )}
        </div>

        
        <div className="mt-3 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !isFormValid()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Sauvegarder</span>
          </button>
        </div>
      </form>
    </div>
  );
};

const HistoryView: React.FC = () => {
  const { user } = useAuth();
  const [globalRules, setGlobalRules] = useState<GlobalRules | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<{
    [date: string]: ImputationHoraire[];
  }>({});
  const [expandedDays, setExpandedDays] = useState<{ [date: string]: boolean }>(
    {}
  );
  const [saving, setSaving] = useState(false);
  const [addingActivities, setAddingActivities] = useState<{ [date: string]: string[] }>({});
  

  const [projects, setProjects] = useState<Projet[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingFormations, setLoadingFormations] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        setLoading(true);
        
        
        const [rules] = await Promise.all([
          fetchGlobalRulesApi(),
          loadProjects(),
          loadFormations()
        ]);
        
        setGlobalRules(rules);

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const weekDays = eachDayOfInterval({
          start: startOfWeek,
          end: endOfWeek,
        });
        setCurrentWeek(weekDays);

        const imputationsData: { [date: string]: ImputationHoraire[] } = {};
        
        await Promise.all(
          weekDays.map(async (day) => {
            if (isWorkingDay(day, rules)) {
              const dateKey = format(day, "yyyy-MM-dd");
              try {
                const data = await fetchDailyImputations(dateKey);
                imputationsData[dateKey] = data.imputations;
              } catch (err) {
                console.error(`Error loading imputations for ${dateKey}:`, err);
                imputationsData[dateKey] = [];
              }
            }
          })
        );
        
        setActivities(imputationsData);
      } catch (err) {
        console.error("Erreur chargement des données:", err);
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement des données"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Fonction pour charger les projets
  const loadProjects = async (): Promise<Projet[]> => {
    try {
      setLoadingProjects(true);
      const projectsData = await fetchEmployeeProjectsApi();
      setProjects(projectsData);
      return projectsData;
    } catch (err) {
      console.error("Erreur chargement des projets:", err);
      setProjects([]);
      return [];
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fonction pour charger les formations
  const loadFormations = async (): Promise<Formation[]> => {
    try {
      setLoadingFormations(true);
      const formationsData = await fetchEmployeeTrainings();
      setFormations(formationsData);
      return formationsData;
    } catch (err) {
      console.error("Erreur chargement des formations:", err);
      setFormations([]);
      return [];
    } finally {
      setLoadingFormations(false);
    }
  };


  const handleFormationCreated = (newFormation: Formation) => {
    console.log('HistoryView: New formation created:', newFormation);
    setFormations(prev => [...prev, newFormation]);
  };

  const isWorkingDay = (date: Date, rules?: GlobalRules): boolean => {
    const effectiveRules = rules || globalRules;
    if (!effectiveRules) return false;

    const dayName = format(date, "EEEE", { locale: fr }).toLowerCase();
    const dateStr = format(date, "yyyy-MM-dd");

    const isFerie = effectiveRules.jours_feries?.some(
      (holiday) => holiday.date === dateStr
    );

    return (
      effectiveRules.jours_ouvrables.includes(dayName) && !isFerie
    );
  };

  const handleAddClick = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const newFormId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setAddingActivities(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newFormId]
    }));
  };

  const handleDuplicateActivity = (date: Date, activity: ImputationHoraire) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const newFormId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setAddingActivities(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newFormId]
    }));
  };

  const handleCancelForm = (date: string, formId: string) => {
    setAddingActivities(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter(id => id !== formId)
    }));
  };

  const handleAddActivity = async (activity: Partial<ImputationHoraire>) => {
    try {
      const payload = {
        ...activity,
        date: activity.date!,
        heures: activity.heures || 0,
        description: activity.description || "",
        valide: false,
        date_saisie: new Date().toISOString(),
        employe: {
          id: user?.id ?? 0,
          nom: user?.nom ?? "",
          prenom: user?.prenom ?? "",
          email: user?.email ?? "",
        },
        projet: activity.categorie === 'projet' ? activity.projet : undefined,
        formation: activity.categorie === "formation" ? activity.formation : undefined,
        categorie: activity.categorie || 'projet',
        valide_par: undefined,
        date_validation: undefined
      };

      const newImputation = await createImputation(payload);

      setActivities((prev) => ({
        ...prev,
        [activity.date!]: [...(prev[activity.date!] || []), newImputation],
      }));
      
      setAddingActivities(prev => ({
        ...prev,
        [activity.date!]: []
      }));
    } catch (err) {
      console.error("Erreur création imputation:", err);
      setError(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    }
  };

  const handleUpdateActivity = async (
    date: Date,
    id: number,
    field: keyof ImputationHoraire,
    value: any
  ) => {
    const dateKey = format(date, "yyyy-MM-dd");
    try {
      setSaving(true);
      const updated = await updateImputation(id, { [field]: value });
      
      setActivities((prev) => ({
        ...prev,
        [dateKey]: prev[dateKey].map((item) =>
          item.id === id ? updated : item
        ),
      }));
    } catch (err) {
      console.error("Erreur mise à jour imputation:", err);
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (date: Date, id: number) => {
    const dateKey = format(date, "yyyy-MM-dd");
    try {
      await deleteImputation(id);
      
      setActivities((prev) => ({
        ...prev,
        [dateKey]: prev[dateKey].filter((item) => item.id !== id),
      }));
    } catch (err) {
      console.error("Erreur suppression imputation:", err);
      setError(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
    }
  };

 const calculateDayTotal = (date: Date): number => {
  const dateKey = format(date, "yyyy-MM-dd");
  const dayActivities = activities[dateKey] || [];
  return dayActivities.reduce((sum, item) => {
    
    const heuresNum = parseFloat(String(item.heures || 0));
    return sum + (isNaN(heuresNum) ? 0 : heuresNum);
  }, 0);
};

  const calculateWeekTotal = (): number => {
    return currentWeek.reduce(
      (sum, day) => {
        const dayTotal = calculateDayTotal(day);
        return sum + (typeof dayTotal === 'number' ? dayTotal : 0);
      },
      0
    );
  };

  const toggleDayExpansion = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const getDayStatus = (date: Date): string => {
    if (!globalRules) return "loading";

    const dayName = format(date, "EEEE", { locale: fr }).toLowerCase();
    const dateStr = format(date, "yyyy-MM-dd");

    const isFerie = globalRules.jours_feries?.some(
      (holiday) => holiday.date === dateStr
    );

    if (isFerie) return "ferie";
    if (!globalRules.jours_ouvrables.includes(dayName)) return "weekend";
    return "working";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <div className="text-amber-700 text-lg font-medium">
            Chargement en cours...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-red-500 text-lg font-medium">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!globalRules) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-red-500 text-lg font-medium">
            Configuration des règles de travail non disponible
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4 shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-3">
            Saisie des heures hebdomadaires
          </h1>
          <div className="bg-white/80 backdrop-blur-sm inline-block px-6 py-3 rounded-2xl shadow-lg border border-amber-200">
            <div className="flex items-center space-x-4 text-amber-700">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  {globalRules.heure_debut_travail} - {globalRules.heure_fin_travail}
                </span>
              </div>
              {globalRules.pause_midi_debut && (
                <div className="flex items-center space-x-2">
                  <Coffee className="w-4 h-4" />
                  <span className="text-sm">
                    Pause: {globalRules.pause_midi_debut}-{globalRules.pause_midi_fin}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-amber-200 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-700">
                {calculateWeekTotal().toFixed(1)}h
              </div>
              <div className="text-sm text-amber-600">Total cette semaine</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {currentWeek.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayName = format(day, "EEEE", { locale: fr });
            const dayStatus = getDayStatus(day);
            const dayActivities = activities[dateKey] || [];
            const isExpanded = expandedDays[dateKey] || false;
            const isWorking = dayStatus === "working";
            const dayTotal = calculateDayTotal(day);
            const activeForms = addingActivities[dateKey] || [];

            return (
              <div
                key={dateKey}
                className={`rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${
                  isWorking
                    ? "bg-white/90 backdrop-blur-sm border border-amber-200 hover:border-amber-300"
                    : "bg-gray-50/80 backdrop-blur-sm border border-gray-200"
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
                          isWorking
                            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        <span className="text-lg font-bold">
                          {format(day, "d")}
                        </span>
                      </div>
                      <div>
                        <h3
                          className={`text-xl font-semibold ${
                            isWorking ? "text-amber-800" : "text-gray-600"
                          }`}
                        >
                          {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <p
                            className={`text-sm ${
                              isWorking ? "text-amber-600" : "text-gray-500"
                            }`}
                          >
                            {dayStatus === "ferie"
                              ? "Jour férié"
                              : dayStatus === "weekend"
                              ? "Week-end"
                              : "Jour travaillé"}
                          </p>
                          {isWorking && dayTotal > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              {typeof dayTotal === 'number' ? dayTotal.toFixed(1) : '0.0'}h
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isWorking && (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleDayExpansion(day)}
                          className="p-3 rounded-xl hover:bg-amber-100 transition-colors duration-200 group"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-amber-600 group-hover:text-amber-700" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-amber-600 group-hover:text-amber-700" />
                          )}
                        </button>
                        <button
                          onClick={() => handleAddClick(day)}
                          className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="font-medium">Ajouter</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isWorking && isExpanded && (
                    <div className="mt-6 space-y-4">
                      {dayActivities.length === 0 && activeForms.length === 0 ? (
                        <div className="text-center py-8 bg-amber-25 rounded-xl border-2 border-dashed border-amber-200">
                          <Clock className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                          <div className="text-amber-500 font-medium">
                            Aucune activité enregistrée
                          </div>
                          <div className="text-amber-400 text-sm mt-1">
                            Cliquez sur "Ajouter" pour commencer
                          </div>
                        </div>
                      ) : (
                        <>
                          {activeForms.map((formId) => (
                            <NewActivityForm 
                              key={formId}
                              formId={formId}
                              date={dateKey}
                              onSave={handleAddActivity}
                              onCancel={() => handleCancelForm(dateKey, formId)}
                              activityTypes={activityTypes}
                              projects={projects}
                              formations={formations}
                              loadingProjects={loadingProjects}
                              loadingFormations={loadingFormations}
                              onFormationCreated={handleFormationCreated}
                            />
                          ))}
                          
                          {dayActivities.map((activity) => {
                            const activityType =
                              activityTypes.find((t) => t.id === activity.categorie) ||
                              activityTypes[0];
                            const Icon = activityType.icon;

                            return (
                              <div
                                key={activity.id}
                                className={`p-4 rounded-xl shadow-sm border-l-4 bg-white hover:shadow-md transition-all duration-200 ${activityType.borderColor}`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className={`p-2 rounded-lg ${activityType.bgColor}`}
                                    >
                                      <Icon
                                        className={`w-5 h-5 ${activityType.textColor}`}
                                      />
                                    </div>
                                   
                                    <select
                                      value={activity.categorie}
                                      onChange={(e) =>
                                        handleUpdateActivity(
                                          day,
                                          activity.id,
                                          "categorie",
                                          e.target.value
                                        )
                                      }
                                      disabled={true} // desacticer apres la creation

                                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                                      title="Impossible de modifier le type après création"
                                    >
                                      {activityTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                          {type.label}
                                        </option>
                                      ))}
                                    </select>
                                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-lg">
                                      Type verrouillé
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleDuplicateActivity(day, activity)}
                                      className="p-2 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
                                      title="Dupliquer cette activité"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteActivity(day, activity.id)}
                                      className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <textarea
                                  value={activity.description || ""}
                                  onChange={(e) => handleUpdateActivity(
                                    day,
                                    activity.id,
                                    "description",
                                    e.target.value
                                  )}
                                  placeholder="Description de l'activité..."
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors resize-none"
                                  rows={2}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Heures
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="24"
                                      step="0.25"
                                      value={activity.heures}
                                      onChange={(e) =>
                                        handleUpdateActivity(
                                          day,
                                          activity.id,
                                          "heures",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                                    />
                                  </div>

                                  {activity.categorie === "projet" && (
                                    <div className="col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Projet
                                      </label>
                                      <select
                                        value={activity.projet?.id || ""}
                                        onChange={(e) => {
                                          const selectedProject = projects.find(p => p.id === parseInt(e.target.value));
                                          handleUpdateActivity(
                                            day,
                                            activity.id,
                                            "projet",
                                            selectedProject || undefined
                                          );
                                        }}
                                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                                      >
                                        <option value="">Sélectionner un projet</option>
                                        {projects.map((project) => (
                                          <option key={project.id} value={project.id}>
                                            {project.identifiant ? `[${project.identifiant}] ` : ''}{project.nom}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {activity.categorie === "formation" && (
                                    <div className="col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Formation
                                      </label>
                                      <FormationSelect
                                        formations={formations}
                                        selectedFormationId={activity.formation?.id}
                                        onSelect={(formation) => handleUpdateActivity(
                                          day,
                                          activity.id,
                                          "formation",
                                          formation
                                        )}
                                        loading={loadingFormations}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="mt-3 flex justify-end">
                                  <button
                                    onClick={() => {}}
                                    className="flex items-center space-x-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                                    disabled={saving}
                                  >
                                    {saving ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4" />
                                    )}
                                    <span>Sauvegarder</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}

                  {isWorking && (dayActivities.length > 0 || activeForms.length > 0) && (
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          {typeof dayTotal === 'number' ? dayTotal.toFixed(1) : '0.0'}h
                        </span>
                        <span className="text-sm text-gray-500">
                          {dayActivities.length + activeForms.length} activité{dayActivities.length + activeForms.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <button 
                        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                        <span>Enregistrer</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-700">
                {calculateWeekTotal().toFixed(1)}h
              </div>
              <div className="text-sm text-amber-600">Heures saisies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">
                {currentWeek.filter(day => getDayStatus(day) === "working").length}
              </div>
              <div className="text-sm text-emerald-600">Jours ouvrables</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-700">
                {Object.values(activities).flat().length}
              </div>
              <div className="text-sm text-orange-600">Activités total</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;