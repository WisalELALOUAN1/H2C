import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getManagerDashboard,
  validateWeek,
  getManagerProjects,
  fetchManagerWeekEntries
} from '../../services/api';
import { ManagerDashboardData, LightProject, ImputationHoraire } from '../../types';
import {
  Clock,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  Calendar,
  Activity,
  Download
} from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateUnifiedJSONReport, generateUnifiedCSVReport, generateUnifiedPDFReport } from '../../utils/reportGeneratorForManager';
import { transformWeekDataToPDFFormat} from '../../utils/managerDataAdapter';
import { generatePDFReport } from '../../utils/pdfExport';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center">
          <div className="text-center p-8">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Erreur</h2>
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = {
    brouillon: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Brouillon' },
    soumis: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Soumis' },
    valide: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Validé' },
    rejete: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Rejeté' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    label: status
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
  gradient: string;
}> = ({ icon, value, label, gradient }) => (
  <div className={`${gradient} text-white p-6 rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-1`}>
    <div className="flex justify-between mb-4">
      <div className="text-white/80">{icon}</div>
    </div>
    <div className="text-3xl font-bold mb-1">{value}</div>
    <div className="text-white/80 text-sm font-medium">{label}</div>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
  </div>
);

const TabNavigation: React.FC<{
  activeTab: number;
  onTabChange: (index: number) => void;
}> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { label: 'Tableau de bord', icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'Validation', icon: <CheckCircle className="w-5 h-5" /> },
    { label: 'Reporting', icon: <FileText className="w-5 h-5" /> }
  ];
  
  return (
    <div className="bg-gradient-to-r from-amber-800 to-amber-700 p-1 rounded-xl mb-8">
      <div className="flex space-x-1">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex-1 justify-center ${
              activeTab === index
                ? 'bg-amber-50 text-amber-800 shadow-md'
                : 'text-amber-100 hover:bg-amber-700/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const DashboardTab: React.FC<{
  dashboardData: ManagerDashboardData;
  loading: boolean;
}> = ({ dashboardData, loading }) => {
  if (loading) return <LoadingSpinner />;
  if (!dashboardData) return <div className="text-center py-12 text-gray-500">Aucune donnée</div>;
  console.log("dashbord data",dashboardData)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Charge par projet</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Projet</th>
                  <th className="px-6 py-4 text-left">Heures</th>
                  
                </tr>
              </thead>
              <tbody>
                {Object.entries(dashboardData.charge_par_projet || {}).map(([projet, data]: [string, any], index) => (
                  <tr key={projet} className={`border-b hover:bg-amber-50/30 ${
                    index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
                  }`}>
                    <td className="px-6 py-4 font-semibold text-amber-800">{projet}</td>
                    <td className="px-6 py-4 font-bold">{data.heures.toFixed(2)}h</td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Indicateurs</h3>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
                <div className="text-sm text-amber-700 mb-1">Semaines à valider</div>
                <div className="text-2xl font-bold text-amber-800">
                  {dashboardData.semaines_a_valider?.length || 0}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                <div className="text-sm text-red-700 mb-1">Projets en retard</div>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.projets_en_retard || 0}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-sky-50 to-sky-100 p-4 rounded-lg border border-sky-200">
                <div className="text-sm text-sky-700 mb-1">H. non productives</div>
                <div className="text-2xl font-bold text-sky-600">
                  {Object.values(dashboardData?.charge_par_categorie ?? {})
                    .filter(c => c.label !== 'Projets')
                    .reduce((t, c) => t + c.heures, 0)
                    .toFixed(1)}h
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-700 mb-1">Période</div>
                <div className="text-lg font-semibold text-gray-800">
                  {dashboardData.periode || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charge par catégorie */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Répartition par catégorie
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Catégorie</th>
                <th className="px-6 py-4 text-left">Heures</th>
                <th className="px-6 py-4 text-left">Pourcentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(dashboardData?.charge_par_categorie ?? {})
                .map(([key, cat]: [string, any], idx) => {
                  const totalHours = Object.values(dashboardData?.charge_par_categorie ?? {})
                    .reduce((sum: number, c: any) => sum + c.heures, 0);
                  const percentage = totalHours > 0 ? (cat.heures / totalHours * 100) : 0;
                  
                  return (
                    <tr key={key}
                        className={`border-b hover:bg-amber-50/30 ${idx % 2 ? 'bg-amber-50/20' : 'bg-white'}`}>
                      <td className="px-6 py-4 font-semibold">{cat.label}</td>
                      <td className="px-6 py-4 font-bold text-amber-600">
                        {cat.heures.toFixed(1)} h
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-600">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Charge par employé</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Employé</th>
                <th className="px-6 py-4 text-left">Heures</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(dashboardData.charge_par_employe || {}).map(([employe, heures]: [string, any], index) => (
                <tr key={employe} className={`border-b hover:bg-amber-50/30 ${
                  index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
                }`}>
                  <td className="px-6 py-4 font-semibold">{employe}</td>
                  <td className="px-6 py-4 font-bold text-amber-600">
                    {heures.toFixed(1)}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ValidationTab: React.FC<{
  weeksToValidate: any[];
  loading: boolean;
  onValidate: (id: number, action: 'valider' | 'rejeter', comment?: string) => void;
  onGenerateWeekReport: (week: any) => void;
  dashboardData: ManagerDashboardData | null;
}> = ({ weeksToValidate, loading, onValidate, onGenerateWeekReport, dashboardData }) => {
  const [comment, setComment] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<'valider' | 'rejeter'>('valider');
  const [reportLoading, setReportLoading] = useState(false);
  
  // Remove duplicates based on week ID
  const uniqueWeeks = useMemo(
    () => Array.from(
      new Map((weeksToValidate ?? [])
        .map(w => [w.id, w])).values()),
    [weeksToValidate]
  );
  
 const handleGenerateWeekReport = async (week: any) => {
  if (!week || !week.employe_id || !week.annee || !week.semaine) {
    return;
  }

  setReportLoading(true);
  try {
    // 1. Fetch week data
    const weekData = await fetchManagerWeekEntries(
      week.employe_id,
      week.annee,
      week.semaine
    );

    // 2. Check if data exists
    if (!weekData) {
      throw new Error("Aucune donnée disponible pour cette semaine");
    }

    // 3. Check if there are any imputations
    if (!weekData.imputations || weekData.imputations.length === 0) {
      throw new Error(`${week.employe_nom} n'a aucune imputation pour cette semaine`);
    }

    // 4. Transform and generate report
    const pdfData = transformWeekDataToPDFFormat(weekData, week.employe_nom);
    await generatePDFReport(pdfData);

  } catch (error) {
    console.error('Erreur lors de la génération du rapport:', error);
    // Show error to user if needed
  } finally {
    setReportLoading(false);
  }
};
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-8 h-8 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-800">Validation des imputations</h2>
        </div>
        
        {uniqueWeeks.length > 0 && (
          <div className="flex items-center space-x-2">
           
          </div>
        )}
      </div>
      
      {uniqueWeeks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Aucune semaine à valider
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Employé</th>
                  <th className="px-6 py-4 text-left">Semaine</th>
                  <th className="px-6 py-4 text-left">Statut</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uniqueWeeks.map((week, index) => (
                  <tr key={week.id} className={`border-b hover:bg-amber-50/30 ${
                    index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
                  }`}>
                    <td className="px-6 py-4 font-semibold">
                      {week.employe_nom}
                    </td>
                    <td className="px-6 py-4">
                      Semaine {week.semaine}, {week.annee}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={week.statut} />
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      {/* Afficher les heures de l'employé */}
                      <div className="text-xs text-gray-500 mb-1">
                        {dashboardData?.charge_par_employe?.[week.employe_nom] 
                          ? `${dashboardData.charge_par_employe[week.employe_nom].toFixed(1)}h saisies` 
                          : 'Aucune donnée saisie'
                        }
                      </div>
                      <button
                        onClick={() => handleGenerateWeekReport(week)}
                        disabled={reportLoading}
                        className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"
                      >
                        📄 Rapport
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWeek(week.id);
                          setSelectedAction('valider');
                          setComment('');
                        }}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWeek(week.id);
                          setSelectedAction('rejeter');
                          setComment('');
                        }}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Rejeter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {selectedWeek && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {selectedAction === 'valider' ? 'Confirmer la validation' : 'Motif de rejet'}
          </h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder={selectedAction === 'valider' ? 'Commentaire (optionnel)' : 'Motif de rejet (obligatoire)'}
            rows={3}
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setSelectedWeek(null)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                onValidate(selectedWeek, selectedAction, comment);
                setSelectedWeek(null);
              }}
              className={`${
                selectedAction === 'valider' 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white px-4 py-2 rounded-lg transition-colors`}
            >
              {selectedAction === 'valider' ? 'Valider' : 'Rejeter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const getCurrentWeekRange = () => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1); // lundi

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6); // dimanche

  const toISO = (d: Date) => d.toISOString().split('T')[0];
  return { start: toISO(monday), end: toISO(sunday) };
};

const ReportingTab: React.FC<{
  onGenerateReport: (params: any) => void;
  loading: boolean;
  projects: LightProject[];
  dashboardData: ManagerDashboardData | null;
}> = ({ onGenerateReport, loading, projects, dashboardData }) => {
  const getCurrentWeekDates = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    return {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd')
    };
  };
  
  const weekDates = getCurrentWeekDates();
  
  const [params, setParams] = useState({
    dateDebut: weekDates.start,
    dateFin: weekDates.end,
    projetId: '',
    format: 'json'
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateReport({
      ...params,
      dateDebut: weekDates.start,
      dateFin: weekDates.end
    });
  };
  
  // Calculate stats for the info box
  const totalHours = useMemo(() => {
    if (!dashboardData) return 0;
    return Object.values(dashboardData.charge_par_employe || {}).reduce((sum, hours) => sum + hours, 0);
  }, [dashboardData]);
  
  const totalProjects = useMemo(() => {
    if (!dashboardData) return 0;
    return Object.keys(dashboardData.charge_par_projet || {}).length;
  }, [dashboardData]);
  
  const totalEmployees = useMemo(() => {
    if (!dashboardData) return 0;
    return Object.keys(dashboardData.charge_par_employe || {}).length;
  }, [dashboardData]);
  
  // Calculate project-specific stats if a project is selected
  const selectedProjectStats = useMemo(() => {
    if (!params.projetId || !dashboardData) return null;
    
    const selectedProject = projects.find(p => p.id.toString() === params.projetId);
    if (!selectedProject) return null;
    
    const projectData = dashboardData.charge_par_projet?.[selectedProject.nom];
    if (!projectData) return null;
    
    const projectHours = projectData.heures;
    const projectValue = projectData.valeur;
    const projectPercentage = totalHours > 0 ? (projectHours / totalHours * 100) : 0;
    const efficiency = projectHours > 0 ? (projectValue / projectHours) : 0;
    
    return {
      name: selectedProject.nom,
      hours: projectHours,
      value: projectValue,
      percentage: projectPercentage,
      efficiency: efficiency
    };
  }, [params.projetId, dashboardData, projects, totalHours]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <FileText className="w-8 h-8 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-800">Génération de rapports unifiés</h2>
      </div>
      
      {/* Statistics overview */}
      {selectedProjectStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Heures projet</div>
            <div className="text-2xl font-bold text-blue-800">{selectedProjectStats.hours.toFixed(1)}h</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Valeur générée</div>
            <div className="text-2xl font-bold text-green-800">€{selectedProjectStats.value.toFixed(0)}</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">% du total</div>
            <div className="text-2xl font-bold text-purple-800">{selectedProjectStats.percentage.toFixed(1)}%</div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Efficacité</div>
            <div className="text-2xl font-bold text-orange-800">€{selectedProjectStats.efficiency.toFixed(1)}/h</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Total heures</div>
            <div className="text-2xl font-bold text-blue-800">{totalHours.toFixed(1)}h</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Projets actifs</div>
            <div className="text-2xl font-bold text-green-800">{totalProjects}</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">Employés</div>
            <div className="text-2xl font-bold text-purple-800">{totalEmployees}</div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Période du rapport : Semaine courante
            </h4>
            <p className="text-sm text-amber-700">
              Du {new Date(weekDates.start).toLocaleDateString('fr-FR')} au {new Date(weekDates.end).toLocaleDateString('fr-FR')}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select
              value={params.format}
              onChange={(e) => setParams({...params, format: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="json">JSON Unifié</option>
              <option value="csv">CSV Unifié</option>
              <option value="pdf">PDF Unifié</option>
            </select>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Rapports unifiés - Toutes les données incluses :
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li><strong>JSON Unifié :</strong> Toutes les données avec métadonnées, résumé et analyses complètes</li>
              <li><strong>CSV Unifié :</strong> Toutes les sections (projets, employés, catégories) dans un seul fichier</li>
              <li><strong>PDF Unifié :</strong> Rapport complet avec métriques, graphiques et recommandations</li>
            </ul>
          </div>
          
          {params.projetId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                📊 Rapport focalisé sur le projet sélectionné
              </h4>
              <p className="text-sm text-blue-700">
                Le rapport contiendra toutes les informations mais avec un focus sur le projet "{projects.find(p => p.id.toString() === params.projetId)?.nom}".
              </p>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{loading ? 'Génération...' : 'Générer le rapport unifié'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState<ManagerDashboardData | null>(null);
  const [projects, setProjects] = useState<LightProject[]>([]);
  const [loading, setLoading] = useState({
    dashboard: false,
    validation: false,
    reporting: false
  });
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (user && user.role === 'manager') {
      loadDashboardData();
      loadProjects();
    }
  }, [user]);
  
  const loadDashboardData = async () => {
    setLoading(prev => ({...prev, dashboard: true}));
    try {
      const data = await getManagerDashboard();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(prev => ({...prev, dashboard: false}));
    }
  };
  
  const loadProjects = async () => {
    try {
      const projectsData = await getManagerProjects();
      setProjects(projectsData);
    } catch (err) {
      console.error('Erreur lors du chargement des projets:', err);
    }
  };
  
  const handleValidateWeek = async (id: number, action: 'valider' | 'rejeter', comment = '') => {
    setLoading(prev => ({...prev, validation: true}));
    try {
      await validateWeek(id, action, comment);
      await loadDashboardData();
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError(`Erreur lors de la ${action === 'valider' ? 'validation' : 'rejet'}`);
    } finally {
      setLoading(prev => ({...prev, validation: false}));
    }
  };
  
  const handleGenerateReport = async (params: any) => {
    if (!dashboardData) {
      setError('Aucune donnée disponible pour générer le rapport');
      return;
    }
    
    setLoading(prev => ({...prev, reporting: true}));
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const selectedProject = params.projetId ? projects.find(p => p.id.toString() === params.projetId) : null;
      const projectName = selectedProject?.nom || 'Tous_Projets';
      const isProjectSpecific = !!params.projetId;
      
      
      let filteredData = { ...dashboardData };
      
      if (isProjectSpecific && selectedProject) {
        const projectData = dashboardData.charge_par_projet?.[selectedProject.nom];
        
        if (projectData) {
          filteredData = {
            ...dashboardData,
            charge_par_projet: {
              [selectedProject.nom]: projectData
            }
          };
        }
      }
      
      switch (params.format) {
        case 'json':
          generateUnifiedJSONReport(
            filteredData,
            `rapport_unifie_${projectName}_${timestamp}.json`,
            isProjectSpecific,
            selectedProject?.nom
          );
          break;
          
        case 'csv':
          generateUnifiedCSVReport(
            filteredData,
            `rapport_unifie_${projectName}_${timestamp}.csv`,
            
          );
          break;
          
        case 'pdf':
          await generateUnifiedPDFReport(
            filteredData,
            `rapport_unifie_${projectName}_${timestamp}.pdf`,
            isProjectSpecific,
            selectedProject?.nom
          );
          break;
          
        default:
          throw new Error('Format de rapport non supporté');
      }
      
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de génération du rapport');
    } finally {
      setLoading(prev => ({...prev, reporting: false}));
    }
  };
  
  const handleGenerateWeekReport = async (week: any) => {
    if (!dashboardData) {
      console.log("rein ");
      return;
    }

    try {
      console.log('Génération du rapport de semaine pour:', week);
      const weekData = await fetchManagerWeekEntries(week.employe_id, week.annee, week.semaine);
      console.log('Données de la semaine:', weekData);
      const pdfData = transformWeekDataToPDFFormat(weekData, week.employe_nom);
      await generatePDFReport(pdfData);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      setError('Erreur lors de la génération du rapport');
    }
  };
  
  // Calculate non-productive hours
  const nonProductiveHours = useMemo(() => {
    if (!dashboardData?.charge_par_categorie) return '0';
    return Object.values(dashboardData.charge_par_categorie)
      .filter(c => c.label !== 'Projets')
      .reduce((t, c) => t + c.heures, 0)
      .toFixed(1);
  }, [dashboardData]);
  
  if (!user || user.role !== 'manager') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center p-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Accès non autorisé</h2>
          <p className="text-gray-600 mb-4">Seuls les managers peuvent accéder à cette page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">
              Tableau de Bord Manager
            </h1>
            <p className="text-lg text-amber-700 font-medium">
              {user.prenom} {user.nom}
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <StatCard
              icon={<Users className="w-8 h-8" />}
              value={dashboardData?.equipes?.length?.toString() || '0'}
              label="Équipes"
              gradient="bg-gradient-to-br from-amber-600 to-amber-700"
            />
            <StatCard
              icon={<CheckCircle className="w-8 h-8" />}
              value={dashboardData?.semaines_a_valider?.length?.toString() || '0'}
              label="À valider"
              gradient="bg-gradient-to-br from-orange-600 to-orange-700"
            />
            <StatCard
              icon={<XCircle className="w-8 h-8" />}
              value={dashboardData?.projets_en_retard?.toString() || '0'}
              label="Retards"
              gradient="bg-gradient-to-br from-red-600 to-red-700"
            />
            <StatCard
              icon={<Activity className="w-8 h-8" />}
              value={`${nonProductiveHours}h`}
              label="H. non productives"
              gradient="bg-gradient-to-br from-sky-600 to-sky-700"
            />
            <StatCard
              icon={<Calendar className="w-8 h-8" />}
              value={dashboardData?.periode || 'N/A'}
              label="Période"
              gradient="bg-gradient-to-br from-yellow-600 to-yellow-700"
            />
          </div>
          
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            {activeTab === 0 && (
              <DashboardTab 
                dashboardData={dashboardData!} 
                loading={loading.dashboard} 
              />
            )}
            {activeTab === 1 && (
              <ValidationTab
                weeksToValidate={dashboardData?.semaines_a_valider || []}
                loading={loading.validation}
                onValidate={handleValidateWeek}
                onGenerateWeekReport={handleGenerateWeekReport}
                dashboardData={dashboardData}
              />
            )}
            {activeTab === 2 && (
              <ReportingTab
                onGenerateReport={handleGenerateReport}
                loading={loading.reporting}
                projects={projects}
                dashboardData={dashboardData}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ManagerDashboard;

