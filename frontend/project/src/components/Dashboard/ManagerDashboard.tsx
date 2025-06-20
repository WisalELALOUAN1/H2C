import React from 'react';
import { Users, Target, BarChart3, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { icon: Users, label: 'Équipe', value: '12', color: 'text-blue-600' },
    { icon: Target, label: 'Objectifs atteints', value: '8/10', color: 'text-green-600' },
    { icon: BarChart3, label: 'Performance équipe', value: '87%', color: 'text-purple-600' },
    { icon: Calendar, label: 'Réunions cette semaine', value: '5', color: 'text-orange-600' }
  ];

  const teamMembers = [
    { id: 1, name: 'Marie Dubois', role: 'Développeur', status: 'Actif', performance: 95 },
    { id: 2, name: 'Pierre Martin', role: 'Designer', status: 'Actif', performance: 88 },
    { id: 3, name: 'Sophie Durand', role: 'Analyste', status: 'Congé', performance: 92 },
    { id: 4, name: 'Thomas Leroy', role: 'Développeur', status: 'Actif', performance: 79 }
  ];

  const projects = [
    { id: 1, name: 'Site Web Client A', progress: 75, deadline: '2024-02-01', status: 'En cours' },
    { id: 2, name: 'App Mobile B', progress: 90, deadline: '2024-01-25', status: 'Bientôt terminé' },
    { id: 3, name: 'Refonte Intranet', progress: 45, deadline: '2024-03-01', status: 'En cours' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Tableau de bord Manager - {user?.prenom}
        </h1>
        <p className="text-brown-100 mt-2">
          Gérez votre équipe et suivez les performances
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
          <h3 className="text-lg font-semibold text-brown-900 mb-4">Équipe</h3>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex justify-between items-center p-3 bg-beige-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-brown-900">{member.name}</h4>
                  <p className="text-sm text-brown-600">{member.role}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    member.status === 'Actif' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {member.status}
                  </span>
                  <p className="text-sm text-brown-600 mt-1">
                    Performance: {member.performance}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-beige-200">
          <h3 className="text-lg font-semibold text-brown-900 mb-4">Projets en cours</h3>
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="p-3 bg-beige-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-brown-900">{project.name}</h4>
                  <span className="text-sm text-brown-600">{project.progress}%</span>
                </div>
                <div className="w-full bg-beige-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-brown-600 h-2 rounded-full" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-brown-600">
                  <span>{project.status}</span>
                  <span>Échéance: {project.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;