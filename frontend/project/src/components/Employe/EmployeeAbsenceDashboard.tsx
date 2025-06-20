import React, { useEffect, useState } from 'react';
import LeaveRequestForm from './LeaveRequestForm';
import { LeaveRequest } from '../../types';


interface DashboardData {
  solde: number;
  demandes: LeaveRequest[];
}

const EmployeeAbsenceDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('http://localhost:8000/gestion-absences-conges/employe/dashboard/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      setData(resData);
    } catch (error) {
      console.error("Erreur lors du chargement du dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSuccess = async () => {
    await fetchDashboard();
    setShowForm(false);
    setEditingRequest(null);
  };

  const handleEdit = (request: LeaveRequest) => {
    setEditingRequest(request);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette demande ?")) {
      const token = localStorage.getItem('accessToken');
      try {
        const response = await fetch(
          `http://localhost:8000/gestion-absences-conges/demande-conge/${id}/`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.ok) {
          handleSuccess();
        } else {
          alert("Erreur lors de la suppression");
        }
      } catch (error) {
        console.error("Erreur:", error);
        alert("Une erreur est survenue");
      }
    }
  };

  const statusKeys = ['en attente', 'validé', 'refusé'] as const;
  type StatusType = typeof statusKeys[number];

  const renderStatusBadge = (status: string) => {
    const statusClasses: Record<StatusType, string> = {
      'en attente': 'bg-amber-100 text-amber-800 border border-amber-200',
      'validé': 'bg-green-100 text-green-800 border border-green-200',
      'refusé': 'bg-red-100 text-red-800 border border-red-200'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[status as StatusType] || 'bg-stone-100 text-stone-800 border border-stone-200'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
          <p className="text-stone-600 font-medium">Chargement en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-stone-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 bg-white rounded-2xl shadow-lg p-6 border border-stone-200">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-stone-800 mb-2">Tableau de bord des congés</h1>
            <p className="text-stone-600">Gérez vos demandes de congés et consultez votre solde</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl font-semibold hover:from-amber-700 hover:to-amber-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            + Nouvelle demande
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-stone-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-stone-700 mb-2">Solde de congés disponible</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold text-amber-600">{data?.solde ?? 0}</span>
                <span className="text-xl text-stone-600 font-medium">jours</span>
              </div>
            </div>
            <div className="h-16 w-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-200">
          <div className="bg-gradient-to-r from-stone-50 to-amber-50 px-8 py-6 border-b border-stone-200">
            <h3 className="text-xl font-bold text-stone-800">Historique des demandes</h3>
            <p className="text-stone-600 mt-1">Consultez et gérez vos demandes de congés</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 uppercase tracking-wider">Date début</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 uppercase tracking-wider">Date fin</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 uppercase tracking-wider">Durée</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 uppercase tracking-wider">Soumis le</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-stone-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {data?.demandes?.length ? (
                  data.demandes.map((demande, index) => (
                    <tr key={demande.id} className={`hover:bg-amber-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-stone-800">{demande.type_demande}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-stone-600">
                        {new Date(demande.date_debut).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-stone-600">
                        {new Date(demande.date_fin).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(demande.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${demande.demi_jour ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'}`}>
                          {demande.demi_jour ? "Demi-journée" : "Journée complète"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-stone-600">
                        {new Date(demande.date_soumission).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {demande.status === 'en attente' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(demande)}
                              className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors duration-200"
                              title="Modifier"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(demande.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors duration-200"
                              title="Supprimer"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                        )}
                        {demande.status !== 'en attente' && (
                          <span className="text-stone-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="h-16 w-16 bg-stone-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-stone-500 font-medium">Aucune demande trouvée</p>
                          <p className="text-stone-400 text-sm">Créez votre première demande de congé</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <LeaveRequestForm 
          onClose={() => {
            setShowForm(false);
            setEditingRequest(null);
          }} 
          onSuccess={handleSuccess}
          existingRequest={editingRequest}
        />
      )}
    </div>
  );
};

export default EmployeeAbsenceDashboard;