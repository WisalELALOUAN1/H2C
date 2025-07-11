// src/components/Employe/TimeTrackingForm.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  fetchEmployeeProjects,
  fetchWeekTimeEntries,
  submitTimeEntry,
  fetchMonthlySummary,
  fetchTimeEntriesHistory,
  exportTimeEntries,getAuthHeaders ,submitWeeklyImputations
} from '../../services/api';
import { 
  Projet,
  WeeklyImputation,
  TimeEntryData,
  MonthlySummary,
  ReportData,
  ReportParams,
  TimeCategory
} from '../../types';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  eachDayOfInterval,
  getWeek,
  getYear
} from 'date-fns';
import { fr } from 'date-fns/locale';

const TimeTrackingForm: React.FC = () => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [projects, setProjects] = useState<Projet[]>([]);
  const [timeEntries, setTimeEntries] = useState<Record<string, Record<string, number>>>({});
  const [submissionStatus, setSubmissionStatus] = useState<'brouillon' | 'soumis' | 'valide' | 'rejete'>('brouillon');
  const [loading, setLoading] = useState({
    projects: true,
    entries: true,
    submission: false
  });
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'history'>('weekly');
  const [managerComment, setManagerComment] = useState<string | null>(null);

  // Catégories de temps
  const timeCategories: TimeCategory[] = [
    { id: 'projet', label: 'Heures projets' },
    { id: 'formation', label: 'Formation' },
    { id: 'absence', label: 'Absence' },
    { id: 'autre', label: 'Autre activité' }
  ];

  // Chargement initial des données
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(prev => ({ ...prev, projects: true, entries: true }));
        setError(null);

        const [projectsData, weekData] = await Promise.all([
          fetchEmployeeProjects(),
          fetchWeekTimeEntries(format(startOfWeek(currentWeek), 'yyyy-MM-dd'))
        ]);

        setProjects(projectsData);
        initializeEntries(projectsData, weekData);
        setSubmissionStatus(weekData.semaine_status);
        setManagerComment(weekData.commentaire || null); 
       
      } catch (err) {
        setError('Erreur lors du chargement des données');
        console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, projects: false, entries: false }));
      }
    };

    loadData();
  }, [currentWeek]);

  // Initialisation des entrées
  const initializeEntries = (projects: Projet[], weekData: WeeklyImputation) => {
    const newEntries: Record<string, Record<string, number>> = {};
  
    projects.forEach(project => {
      newEntries[project.id] = {};
      timeCategories.forEach(cat => {
        newEntries[project.id][cat.id] = 0;
      });
    });

    weekData.imputations.forEach(entry => {
  if (newEntries[entry.projet.id]) { 
    newEntries[entry.projet.id][entry.categorie] = entry.heures;
  }
});

    setTimeEntries(newEntries);
  };

  // Gestion du changement d'heures
  const handleTimeChange = async (projectId: string, category: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const newEntries = { ...timeEntries };
    newEntries[projectId][category] = numericValue;
    setTimeEntries(newEntries);

    try {
      await submitTimeEntry({
        projet: { // Utilisez l'objet projet conforme à TimeEntryData
          id: Number(projectId), 
          nom: projects.find(p => String(p.id) === String(projectId))?.nom || ''
        },
        date: format(currentWeek, 'yyyy-MM-dd'),
        categorie: category,
        heures: numericValue,
        employe: user ? { id: user.id, nom: user.nom, prenom: user.prenom } : undefined
      });
    } catch (err) {
      console.error('Erreur de sauvegarde:', err);
      setError('Erreur lors de la sauvegarde');
    }
  };

  // Soumission de la semaine
  const handleSubmitWeek = async () => {
    try {
      setLoading(prev => ({ ...prev, submission: true }));
      setError(null);

      const weekNumber = getWeek(currentWeek);
      const year = getYear(currentWeek);
      
      
    
    await submitWeeklyImputations(weekNumber, year, user?.id);
    setSubmissionStatus('soumis');
      setSubmissionStatus('soumis');
    } catch (err) {
      setError('Erreur lors de la soumission');
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, submission: false }));
    }
  };

  // Navigation entre les semaines
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'prev' ? -7 : 7));
  };

  // Rendu des jours de la semaine
  const renderWeekDays = () => {
    const weekStart = startOfWeek(currentWeek);
    return Array.from({ length: 5 }).map((_, index) => {
      const day = addDays(weekStart, index);
      return (
        <th 
          key={index} 
          className={`p-2 ${isSameDay(day, new Date()) ? 'bg-blue-50 font-bold' : ''}`}
        >
          <div className="flex flex-col items-center">
            <span className="text-sm">{format(day, 'EEE', { locale: fr })}</span>
            <span className="text-xs">{format(day, 'd MMM', { locale: fr })}</span>
          </div>
        </th>
      );
    });
  };

  if (loading.projects) return <div>Chargement des projets...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          Saisie des heures - Semaine du {format(startOfWeek(currentWeek), 'd MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => navigateWeek('prev')}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            &lt; Précédente
          </button>
          <button 
            onClick={() => navigateWeek('next')}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            Suivante &gt;
          </button>
        </div>
      </div>

      <div className="mb-4">
        Statut: <span className="font-medium capitalize">{submissionStatus}</span>
         Commentaire du manager: {managerComment}
         {(submissionStatus === 'valide' || submissionStatus === 'rejete') && managerComment && (
        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="font-medium text-gray-700">
            Commentaire du manager:
          </div>
          <div className="mt-1 text-gray-600">
            {managerComment}
          </div>
        </div>
      )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border-collapse">
          <thead>
            <tr>
              <th className="p-2 border-b text-left">Projet</th>
              <th className="p-2 border-b text-left">Catégorie</th>
              {renderWeekDays()}
              <th className="p-2 border-b">Total</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <React.Fragment key={project.id}>
                {timeCategories.map((category, catIndex) => (
                  <tr key={`${project.id}-${category.id}`} className={catIndex === 0 ? 'border-t-2 border-gray-200' : ''}>
                    {catIndex === 0 && (
                      <td 
                        rowSpan={timeCategories.length} 
                        className="p-2 border-b align-top"
                      >
                        <div className="font-medium">{project.nom}</div>
                        <div className="text-xs text-gray-500">{project.equipe.id}</div>
                      </td>
                    )}
                    <td className="p-2 border-b">{category.label}</td>
                    {Array.from({ length: 5 }).map((_, dayIndex) => {
                      const day = addDays(startOfWeek(currentWeek), dayIndex);
                      return (
                        <td key={`${project.id}-${dayIndex}`} className="p-2 border-b">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.25"
                            value={timeEntries[project.id]?.[category.id] || 0}
                            onChange={(e) => handleTimeChange(String(project.id), String(category.id), e.target.value)}
                            className="w-16 p-1 border rounded text-center"
                            disabled={submissionStatus !== 'brouillon'}
                          />
                        </td>
                      );
                    })}
                    <td className="p-2 border-b text-center">
                      {timeEntries[project.id]?.[category.id] || 0}h
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {submissionStatus === 'brouillon' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmitWeek}
            disabled={loading.submission}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading.submission ? 'Envoi en cours...' : 'Soumettre la semaine'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TimeTrackingForm;