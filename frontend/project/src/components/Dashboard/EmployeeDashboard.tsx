import React from 'react';
import { Calendar, Clock, FileText, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { icon: Clock, label: 'Heures cette semaine', value: '38h', color: 'text-blue-600' },
    { icon: FileText, label: 'Tâches en cours', value: '7', color: 'text-green-600' },
    { icon: Calendar, label: 'Congés restants', value: '12 jours', color: 'text-purple-600' },
    { icon: TrendingUp, label: 'Performance', value: '92%', color: 'text-orange-600' }
  ];

  const recentTasks = [
    { id: 1, title: 'Rapport mensuel', status: 'En cours', deadline: '2024-01-15' },
    { id: 2, title: 'Formation sécurité', status: 'Terminé', deadline: '2024-01-10' },
    { id: 3, title: 'Réunion équipe', status: 'Planifié', deadline: '2024-01-20' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Bonjour, {user?.firstName} !
        </h1>
        <p className="text-brown-100 mt-2">
          Voici un aperçu de votre espace de travail
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-beige-200">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg bg-gray-100 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-brown-600">{stat.label}</p>
                <p className="text-2xl font-bold text-brown-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-beige-200">
          <h3 className="text-lg font-semibold text-brown-900 mb-4">Tâches récentes</h3>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex justify-between items-center p-3 bg-beige-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-brown-900">{task.title}</h4>
                  <p className="text-sm text-brown-600">Échéance: {task.deadline}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  task.status === 'Terminé' 
                    ? 'bg-green-100 text-green-800'
                    : task.status === 'En cours'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-beige-200">
          <h3 className="text-lg font-semibold text-brown-900 mb-4">Prochains événements</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-beige-50 rounded-lg">
              <Calendar className="h-5 w-5 text-brown-600 mr-3" />
              <div>
                <h4 className="font-medium text-brown-900">Réunion équipe</h4>
                <p className="text-sm text-brown-600">Aujourd'hui, 14h00</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-beige-50 rounded-lg">
              <Calendar className="h-5 w-5 text-brown-600 mr-3" />
              <div>
                <h4 className="font-medium text-brown-900">Formation</h4>
                <p className="text-sm text-brown-600">Demain, 9h00</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;