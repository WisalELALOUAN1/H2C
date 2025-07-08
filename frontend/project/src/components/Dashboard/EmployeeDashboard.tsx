import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getCurrentWeekImputations,
  submitWeek,
  getMonthlySummary,
  getCurrentSolde 
} from '../../services/api';
import { 
  WeeklyImputation, 
  MonthlySummary, 
  EmployeeCurrentSolde
} from '../../types';
import {
  Clock,
  TrendingUp,
  User,
  Calendar,
  XCircle,
  FolderOpen,Euro
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
    soumis: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Soumis' },
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
    { label: 'Imputations', icon: <Clock className="w-5 h-5" /> },
    { label: 'Synthèse', icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'Profil', icon: <User className="w-5 h-5" /> }
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

const WeeklyImputationsTab: React.FC<{
  weekImputations: WeeklyImputation | null;
  loading: boolean;
  onSubmitWeek: () => void;
}> = ({ weekImputations, loading, onSubmitWeek }) => {
  if (loading) return <LoadingSpinner />;
  if (!weekImputations) return <div className="text-center py-12 text-gray-500">Aucune donnée</div>;

  const totalHours = weekImputations.imputations.reduce((sum, imp) => {
  console.log(
    '[REDUCE] sum:', sum,
    'imp.heures:', imp.heures,
    'typeof imp.heures:', typeof imp.heures
  );
  return sum + Number(imp.heures || 0);
}, 0);

console.log('[RESULTAT] totalHours:', totalHours, 'type:', typeof totalHours);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Clock className="w-8 h-8 text-amber-600" />
          <h2 className="text-2xl font-bold text-gray-800">Imputations</h2>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-red-600">{`${Number(totalHours || 0).toFixed(1)}h`}</div>
          <div className="text-sm text-gray-600">Total semaine</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
        <tr>
          <th className="px-6 py-4 text-left">Date</th>
          <th className="px-6 py-4 text-left">Activité</th>
          <th className="px-6 py-4 text-left">Heures</th>
          
        </tr>
      </thead>


      <tbody>
  {weekImputations.imputations.map((imputation, index) => {
    // Détermine le nom à afficher selon la catégorie
    const activityName = imputation.categorie === 'formation' 
      ? 'Formation' 
      : imputation.categorie === 'absence'
      ? 'Absence'
      : imputation.categorie === 'admin'
      ? 'Tâches administratives'
      : "	Contribution au projet "+imputation.projet?.nom || 'Autre activité';

    // Styles conditionnels
    const categoryStyle = {
      formation: 'bg-emerald-100 text-emerald-800',
      absence: 'bg-red-100 text-red-800',
      projet: 'bg-amber-100 text-amber-800',
      admin: 'bg-purple-100 text-purple-800',
      default: 'bg-gray-100 text-gray-800'
    };

    const textColor = imputation.categorie === 'formation' ? 'text-emerald-700' :
                     imputation.categorie === 'absence' ? 'text-red-700' :
                     imputation.categorie === 'admin' ? 'text-purple-700' :
                     'text-amber-800';

    const hoursColor = imputation.categorie === 'absence' 
      ? 'text-red-600' 
      : 'text-amber-600';

    return (
      <tr key={imputation.id} className={`border-b hover:bg-amber-50/30 ${
        index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
      }`}>
        <td className="px-6 py-4 font-semibold">
          {new Date(imputation.date).toLocaleDateString()}
        </td>
        <td className={`px-6 py-4 font-semibold ${textColor}`}>
          {activityName}
        </td>
        <td className={`px-6 py-4 font-bold ${hoursColor}`}>
          {Number(imputation.heures || 0).toFixed(1)}h
        </td>
        
      </tr>
    );
  })}
</tbody>
    </table>
  </div>
</div>

      <div className="bg-gradient-to-r from-amber-50 to-white p-6 rounded-xl border border-amber-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-800">Statut :</h3>
            <StatusBadge status={weekImputations.semaine_status} />
          </div>
          
          
        </div>
      </div>
    </div>
  );
};

const MonthlySummaryTab: React.FC<{
  monthlySummary: MonthlySummary | null;
  loading: boolean;
}> = ({ monthlySummary, loading }) => {
  if (loading) return <LoadingSpinner />;
  if (!monthlySummary) return <div className="text-center py-12 text-gray-500">Aucune donnée disponible</div>;

  // Calcul des totaux
  const activities = Object.values(monthlySummary.synthese || {});
  const totalHours = activities.reduce((sum, data) => sum + (data.heures || 0), 0);
  const totalValue = activities.reduce((sum, data) => sum + (data.heures * (data.taux_horaire || 0)), 0);
  const hasActivities = activities.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <TrendingUp className="w-8 h-8 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-800">Synthèse mensuelle</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cartes de synthèse */}
        <div className="grid grid-cols-1 gap-6 lg:col-span-1">
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            value={totalHours.toFixed(2)}
            label="Heures totales"
            gradient="bg-gradient-to-br from-amber-600 to-amber-700"
          />
          <StatCard
            icon={<Euro className="w-6 h-6" />}
            value={totalValue.toFixed(2)}
            label="Valeur totale"
            gradient="bg-gradient-to-br from-green-600 to-green-700"
          />
          <StatCard
            icon={<Calendar className="w-6 h-6" />}
            value={monthlySummary.periode || 'Période non spécifiée'}
            label="Période"
            gradient="bg-gradient-to-br from-blue-600 to-blue-700"
          />
        </div>

        {/* Tableau des activités */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Détail des activités</h3>
            </div>
            
            {hasActivities ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left">Activité</th>
                      <th className="px-6 py-4 text-left">Heures</th>
                      <th className="px-6 py-4 text-left">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(monthlySummary.synthese).map(([activite, data], index) => (
                      <tr 
                        key={`${activite}-${index}`} 
                        className={`border-b hover:bg-amber-50/30 ${
                          index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
                        }`}
                      >
                        <td className="px-6 py-4 font-semibold text-amber-800">
                          {activite}
                        </td>
                        <td className="px-6 py-4 font-bold">
                          {Number(data.heures).toFixed(2)}h
                        </td>
                        <td className="px-6 py-4 font-bold text-red-600">
                          €{(data.heures * (data.taux_horaire || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FolderOpen className="w-12 h-12 mx-auto text-gray-300" />
                <p className="mt-2">Aucune activité enregistrée cette période</p>
                <p className="text-sm text-gray-400">
                  {monthlySummary.periode || ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

        
   


const PersonalDataTab: React.FC<{
  user: any;
  currentSolde: EmployeeCurrentSolde | null;
  loading: boolean;
}> = ({ user, currentSolde, loading }) => {
  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <User className="w-8 h-8 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-800">Profil</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations</h3>
          
          <div className="space-y-3">
            {[
              { label: 'Nom', value: `${user.prenom || ''} ${user.nom || ''}`.trim() || 'N/A' },
              { label: 'Email', value: user.email || 'N/A' },
              { label: 'Rôle', value: user.role || 'N/A' },
             
            ].map(({ label, value }) => (
              <div key={label} className="flex">
                <div className="font-semibold text-amber-800 w-24">{label}:</div>
                <div className="text-gray-700">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Congés</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {currentSolde?.jours_restants || 0}
              </div>
              <div className="text-sm text-green-700">Restants</div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200 text-center">
              <div className="text-2xl font-bold text-amber-600 mb-1">
                {currentSolde?.conges_pris_mois || 0}
              </div>
              <div className="text-sm text-amber-700">Pris (mois)</div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {currentSolde?.jours_acquis_annuels || 0}
              </div>
              <div className="text-sm text-blue-700">Acquis (an)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [weekImputations, setWeekImputations] = useState<WeeklyImputation | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [currentSolde, setCurrentSolde] = useState<EmployeeCurrentSolde | null>(null);
  const [loading, setLoading] = useState({
    week: false,
    month: false,
    solde: false
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCurrentWeek();
      loadMonthlySummary();
      loadCurrentSolde();
    }
  }, [user]);

  const loadCurrentWeek = async () => {
    setLoading(prev => ({...prev, week: true}));
    try {
      const data = await getCurrentWeekImputations();
      setWeekImputations(data);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de chargement');
    } finally {
      setLoading(prev => ({...prev, week: false}));
    }
  };

  const loadMonthlySummary = async () => {
    setLoading(prev => ({...prev, month: true}));
    try {
      const today = new Date();

      const data = await getMonthlySummary(today.getFullYear(), today.getMonth() + 1);
      console.log(data);
      setMonthlySummary(data);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de chargement');
    } finally {
      setLoading(prev => ({...prev, month: false}));
    }
  };

  const loadCurrentSolde = async () => {
    setLoading(prev => ({...prev, solde: true}));
    try {
      const data = await getCurrentSolde();
      console.log("Données solde:", data); // Debug
      setCurrentSolde(data);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de chargement');
    } finally {
      setLoading(prev => ({...prev, solde: false}));
    }
  };

  const handleSubmitWeek = async () => {
    try {
      await submitWeek();
      await loadCurrentWeek();
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de soumission');
    }
  };

  const totalHours = weekImputations?.imputations.reduce((sum, imp) => sum + Number(imp.heures || 0), 0) || 0;
  const uniqueProjectsCount = weekImputations?.imputations.reduce((acc, imp) => {
  if (imp.categorie === 'projet' && imp.projet?.nom) {
    acc.add(imp.projet.nom);
  }
  return acc;
}, new Set<string>()).size || 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-red-600 bg-clip-text text-transparent mb-2">
              Tableau de Bord
            </h1>
            <p className="text-lg text-amber-700 font-medium">
              Bonjour, {user.prenom}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Clock className="w-8 h-8" />}
              value={`${Number(totalHours || 0).toFixed(1)}h`}
              label="Semaine"
              gradient="bg-gradient-to-br from-amber-600 to-amber-700"
            />
            <StatCard
              icon={<TrendingUp className="w-8 h-8" />}
              value={`${monthlySummary?.total_heures?.toFixed(1) || '0'}h`}
              label="Mois"
              gradient="bg-gradient-to-br from-red-600 to-red-700"
            />
            <StatCard
              icon={<Calendar className="w-8 h-8" />}
              value={uniqueProjectsCount.toString()}
              label="Projets"
              gradient="bg-gradient-to-br from-blue-600 to-blue-700"
            />
            <StatCard
              icon={<User className="w-8 h-8" />}
              value={`${currentSolde?.conges_pris_mois || 0}/${currentSolde?.jours_acquis_annuels || 0}`}
              label="Congés"
              gradient="bg-gradient-to-br from-green-600 to-green-700"
            />
          </div>

          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            {activeTab === 0 && (
              <WeeklyImputationsTab
                weekImputations={weekImputations}
                loading={loading.week}
                onSubmitWeek={handleSubmitWeek}
              />
            )}
            {activeTab === 1 && (
              <MonthlySummaryTab
                monthlySummary={monthlySummary}
                loading={loading.month}
              />
            )}
            {activeTab === 2 && (
              <PersonalDataTab
                user={user}
                currentSolde={currentSolde}
                loading={loading.solde}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default EmployeeDashboard;