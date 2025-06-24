import React, { useState, useEffect } from 'react';
import { fetchEmployeeSoldeHistory, fetchAllCurrentSoldes } from '../../services/api';
import { EmployeeCurrentSolde, SoldeHistory } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { History, User, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const AdminSoldeHistory: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeCurrentSolde[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [history, setHistory] = useState<SoldeHistory[]>([]);
  const [loading, setLoading] = useState({
    employees: true,
    history: false
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(prev => ({ ...prev, employees: true }));
        setError(null);
        
        const soldes = await fetchAllCurrentSoldes();
        console.log('Données employés reçues:', soldes);
        
        if (!soldes || !Array.isArray(soldes)) {
          throw new Error('Format de données invalide');
        }

        // Eviter les doublons lors de la recuperation des employes
        const uniqueEmployees = soldes.reduce((acc: EmployeeCurrentSolde[], current) => {
          const existingEmployee = acc.find(emp => emp.user.id === current.user.id);
          if (!existingEmployee) {
            acc.push(current);
          }
          return acc;
        }, []);

        setEmployees(uniqueEmployees);

        if (uniqueEmployees.length > 0) {
          setSelectedEmployee(uniqueEmployees[0].user.id);
        }
      } catch (err) {
        console.error('Erreur de chargement:', err);
        setError('Erreur lors du chargement des données');
        setEmployees([]);
      } finally {
        setLoading(prev => ({ ...prev, employees: false }));
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!selectedEmployee) return;

    const loadHistory = async () => {
      try {
        setLoading(prev => ({...prev, history: true}));
        const data = await fetchEmployeeSoldeHistory(selectedEmployee);
        console.log('Historique reçu:', data);
        setHistory(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erreur de chargement:", error);
        setHistory([]);
      } finally {
        setLoading(prev => ({...prev, history: false}));
      }
    };
    loadHistory();
  }, [selectedEmployee]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const getDifferenceIcon = (difference: number | null) => {
    if (difference === null || difference === 0) return <Minus className="w-4 h-4 text-stone-400" />;
    if (difference > 0) return <TrendingUp className="w-4 h-4 text-amber-600" />;
    return <TrendingDown className="w-4 h-4 text-orange-600" />;
  };

  const getDifferenceColor = (difference: number | null) => {
    if (difference === null || difference === 0) return 'text-stone-600';
    if (difference > 0) return 'text-amber-700 font-semibold';
    return 'text-orange-700 font-semibold';
  };

  const getSelectedEmployeeName = () => {
    if (!selectedEmployee) return '';
    const employee = employees.find(emp => emp.user.id === selectedEmployee);
    return employee ? `${employee.user.prenom} ${employee.user.nom}` : '';
  };

  if (loading.employees) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-700 text-center">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-amber-600">
          <div className="flex items-center">
            <div className="text-amber-600 mr-4">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-800">Erreur</h3>
              <p className="text-amber-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-amber-100 p-3 rounded-full mr-4">
                <History className="text-amber-700" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-amber-900">Historique des soldes</h1>
                <p className="text-amber-700 mt-1">Consultez l'évolution des soldes de congés</p>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-amber-50 px-4 py-2 rounded-lg">
                <p className="text-sm text-amber-700 font-medium">
                  {employees.length} employé{employees.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Liste des employés */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <User className="mr-2" size={20} />
                  Employés
                </h2>
              </div>
              <div className="p-4">
                {employees.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="mx-auto text-amber-300 mb-3" size={48} />
                    <p className="text-amber-600">Aucun employé disponible</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {employees.map(emp => (
                      <div 
                        key={emp.user.id}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                          selectedEmployee === emp.user.id 
                            ? 'bg-amber-50 border-amber-200 shadow-md' 
                            : 'hover:bg-stone-50 border-transparent hover:border-stone-200'
                        }`}
                        onClick={() => setSelectedEmployee(emp.user.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-amber-900">
                              {emp.user.prenom} {emp.user.nom}
                            </p>
                            <p className="text-sm text-amber-600">
                              {emp.user.email}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              emp.solde_actuel > 15 
                                ? 'bg-amber-100 text-amber-800'
                                : emp.solde_actuel > 5
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-stone-100 text-stone-800'
                            }`}>
                              {emp.solde_actuel} j
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Historique */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-stone-600 to-amber-700 p-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Calendar className="mr-2" size={20} />
                  Historique {getSelectedEmployeeName() && `- ${getSelectedEmployeeName()}`}
                </h2>
              </div>
              
              <div className="p-6">
                {!selectedEmployee ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto text-amber-300 mb-4" size={64} />
                    <p className="text-amber-600 text-lg">Sélectionnez un employé pour voir son historique</p>
                  </div>
                ) : loading.history ? (
                  <div className="text-center py-12">
                    <div className="animate-pulse">
                      <div className="h-4 bg-amber-200 rounded w-3/4 mx-auto mb-4"></div>
                      <div className="h-4 bg-amber-200 rounded w-1/2 mx-auto mb-4"></div>
                      <div className="h-4 bg-amber-200 rounded w-2/3 mx-auto"></div>
                    </div>
                    <p className="text-amber-600 mt-4">Chargement de l'historique...</p>
                  </div>
                ) : history.length > 0 ? (
                  <div className="space-y-4">
                    {/* Stats rapides */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <p className="text-sm text-amber-700 font-medium">Solde actuel</p>
                        <p className="text-2xl font-bold text-amber-800">
                          {history[0]?.solde_actuel || 0} jours
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm text-orange-700 font-medium">Dernière modification</p>
                        <p className="text-lg font-semibold text-orange-800">
                          {formatDate(history[0]?.date_modif || '')}
                        </p>
                      </div>
                      <div className="bg-stone-50 p-4 rounded-lg">
                        <p className="text-sm text-stone-700 font-medium">Nb. modifications</p>
                        <p className="text-2xl font-bold text-stone-800">
                          {history.length}
                        </p>
                      </div>
                    </div>

                    {/* Tableau d'historique */}
                    <div className="bg-stone-50 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-stone-100">
                            <tr>
                              <th className="text-left py-4 px-6 text-sm font-semibold text-stone-700">Date et heure</th>
                              <th className="text-left py-4 px-6 text-sm font-semibold text-stone-700">Solde</th>
                              <th className="text-left py-4 px-6 text-sm font-semibold text-stone-700">Évolution</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200">
                            {history.map((record, index) => (
                              <tr key={record.id} className="hover:bg-white transition-colors duration-150">
                                <td className="py-4 px-6">
                                  <div>
                                    <p className="font-medium text-amber-900">{formatDate(record.date_modif)}</p>
                                    <p className="text-sm text-amber-600">{formatTime(record.date_modif)}</p>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    record.solde_actuel > 15 
                                      ? 'bg-amber-100 text-amber-800'
                                      : record.solde_actuel > 5
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-stone-100 text-stone-800'
                                  }`}>
                                    {record.solde_actuel} jours
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center">
                                    {getDifferenceIcon(record.difference)}
                                    <span className={`ml-2 ${getDifferenceColor(record.difference)}`}>
                                      {record.difference !== null 
                                        ? (record.difference > 0 ? `+${record.difference}` : record.difference)
                                        : '—'
                                      }
                                      {record.difference !== null && record.difference !== 0 && ' jours'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="mx-auto text-amber-300 mb-4" size={64} />
                    <p className="text-amber-600 text-lg">Aucun historique disponible</p>
                    <p className="text-amber-500 text-sm mt-2">Les modifications de solde apparaîtront ici</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSoldeHistory;