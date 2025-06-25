import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getManagerDashboard,
  validateWeek,
  getTeamReport
} from '../../services/api';
import {
  Clock,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  Calendar
} from 'lucide-react';

// Error Boundary Component
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
  dashboardData: any;
  loading: boolean;
}> = ({ dashboardData, loading }) => {
  if (loading) return <LoadingSpinner />;
  if (!dashboardData) return <div className="text-center py-12 text-gray-500">Aucune donnée</div>;

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
                  <th className="px-6 py-4 text-left">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dashboardData.charge_par_projet || {}).map(([projet, data]: [string, any], index) => (
                  <tr key={projet} className={`border-b hover:bg-amber-50/30 ${
                    index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
                  }`}>
                    <td className="px-6 py-4 font-semibold text-amber-800">{projet}</td>
                    <td className="px-6 py-4 font-bold">{data.heures.toFixed(2)}h</td>
                    <td className="px-6 py-4 font-bold text-green-600">
                      €{data.valeur.toFixed(2)}
                    </td>
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
}> = ({ weeksToValidate, loading, onValidate }) => {
  const [comment, setComment] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <CheckCircle className="w-8 h-8 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-800">Validation des imputations</h2>
      </div>

      {weeksToValidate.length === 0 ? (
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
                  <th className="px-6 py-4 text-left">Heures</th>
                  <th className="px-6 py-4 text-left">Statut</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {weeksToValidate.map((week, index) => (
                  <tr key={week.id} className={`border-b hover:bg-amber-50/30 ${
                    index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
                  }`}>
                    <td className="px-6 py-4 font-semibold">
                      {week.employe.prenom} {week.employe.nom}
                    </td>
                    <td className="px-6 py-4">
                      Semaine {week.semaine}, {week.annee}
                    </td>
                    <td className="px-6 py-4 font-bold text-amber-600">
                      {week.total_heures?.toFixed(1) || '0'}h
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={week.statut} />
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => {
                          setSelectedWeek(week.id);
                          setComment('');
                        }}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWeek(week.id);
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
            {weeksToValidate.find(w => w.id === selectedWeek)?.statut === 'rejete' 
              ? 'Commentaire de rejet' 
              : 'Confirmer la validation'}
          </h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            placeholder="Commentaire (optionnel)"
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
                const action = weeksToValidate.find(w => w.id === selectedWeek)?.statut === 'rejete' 
                  ? 'valider' 
                  : 'rejeter';
                onValidate(selectedWeek, action, comment);
                setSelectedWeek(null);
              }}
              className={`${
                weeksToValidate.find(w => w.id === selectedWeek)?.statut === 'rejete' 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white px-4 py-2 rounded-lg transition-colors`}
            >
              {weeksToValidate.find(w => w.id === selectedWeek)?.statut === 'rejete' 
                ? 'Valider' 
                : 'Rejeter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportingTab: React.FC<{
  onGenerateReport: (params: any) => void;
  loading: boolean;
}> = ({ onGenerateReport, loading }) => {
  const [params, setParams] = useState({
    dateDebut: '',
    dateFin: '',
    projetId: '',
    format: 'json'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateReport(params);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <FileText className="w-8 h-8 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-800">Génération de rapports</h2>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={params.dateDebut}
                onChange={(e) => setParams({...params, dateDebut: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={params.dateFin}
                onChange={(e) => setParams({...params, dateFin: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Projet (optionnel)
            </label>
            <input
              type="text"
              value={params.projetId}
              onChange={(e) => setParams({...params, projetId: e.target.value})}
              placeholder="ID du projet"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select
              value={params.format}
              onChange={(e) => setParams({...params, format: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Génération...' : 'Générer le rapport'}
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
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState({
    dashboard: false,
    validation: false,
    reporting: false
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === 'manager') {
      loadDashboardData();
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

  const handleValidateWeek = async (id: number, action: 'valider' | 'rejeter', comment = '') => {
    setLoading(prev => ({...prev, validation: true}));
    try {
      await validateWeek(id, action, comment);
      await loadDashboardData(); // Refresh data
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError(`Erreur lors de la ${action === 'valider' ? 'validation' : 'rejet'}`);
    } finally {
      setLoading(prev => ({...prev, validation: false}));
    }
  };

  const handleGenerateReport = async (params: any) => {
    setLoading(prev => ({...prev, reporting: true}));
    try {
      const report = await getTeamReport(params);
      // Handle report download based on format
      if (params.format === 'json') {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_equipe_${new Date().toISOString()}.json`;
        a.click();
      }
      // Add CSV and PDF handling here
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de génération du rapport');
    } finally {
      setLoading(prev => ({...prev, reporting: false}));
    }
  };

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Users className="w-8 h-8" />}
              value={dashboardData?.equipes?.length || '0'}
              label="Équipes"
              gradient="bg-gradient-to-br from-amber-600 to-amber-700"
            />
            <StatCard
              icon={<CheckCircle className="w-8 h-8" />}
              value={dashboardData?.semaines_a_valider?.length || '0'}
              label="À valider"
              gradient="bg-gradient-to-br from-orange-600 to-orange-700"
            />
            <StatCard
              icon={<XCircle className="w-8 h-8" />}
              value={dashboardData?.projets_en_retard || '0'}
              label="Retards"
              gradient="bg-gradient-to-br from-red-600 to-red-700"
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
                dashboardData={dashboardData} 
                loading={loading.dashboard} 
              />
            )}
            {activeTab === 1 && (
              <ValidationTab
                weeksToValidate={dashboardData?.semaines_a_valider || []}
                loading={loading.validation}
                onValidate={handleValidateWeek}
              />
            )}
            {activeTab === 2 && (
              <ReportingTab
                onGenerateReport={handleGenerateReport}
                loading={loading.reporting}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ManagerDashboard;