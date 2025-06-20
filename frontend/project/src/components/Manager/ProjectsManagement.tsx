import React from 'react';
import { Target, Clock, Users, CheckCircle } from 'lucide-react';

const ProjectsManagement: React.FC = () => {
  const projects = [
    { 
      id: 1, 
      name: 'Site Web Client A', 
      progress: 75, 
      deadline: '2024-02-01', 
      status: 'En cours',
      team: ['MD', 'PM', 'TL'],
      priority: 'Haute'
    },
    { 
      id: 2, 
      name: 'App Mobile B', 
      progress: 90, 
      deadline: '2024-01-25', 
      status: 'Bientôt terminé',
      team: ['SD', 'ER'],
      priority: 'Critique'
    },
    { 
      id: 3, 
      name: 'Refonte Intranet', 
      progress: 45, 
      deadline: '2024-03-01', 
      status: 'En cours',
      team: ['LB', 'PM', 'MD'],
      priority: 'Moyenne'
    },
    { 
      id: 4, 
      name: 'Formation Équipe', 
      progress: 100, 
      deadline: '2024-01-15', 
      status: 'Terminé',
      team: ['ER'],
      priority: 'Basse'
    }
  ];

  const stats = [
    { icon: Target, label: 'Projets actifs', value: projects.filter(p => p.status !== 'Terminé').length.toString(), color: 'text-blue-600' },
    { icon: CheckCircle, label: 'Projets terminés', value: projects.filter(p => p.status === 'Terminé').length.toString(), color: 'text-green-600' },
    { icon: Clock, label: 'En retard', value: '1', color: 'text-red-600' },
    { icon: Users, label: 'Équipes impliquées', value: '6', color: 'text-purple-600' }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critique': return 'bg-red-100 text-red-800';
      case 'Haute': return 'bg-orange-100 text-orange-800';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-800';
      case 'Basse': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Terminé': return 'bg-green-100 text-green-800';
      case 'En cours': return 'bg-blue-100 text-blue-800';
      case 'Bientôt terminé': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Gestion des projets</h1>
        <p className="text-brown-100 mt-2">
          Suivez l'avancement de vos projets et gérez les équipes
        </p>
      </div>

      {/* Stats */}
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

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-xl p-6 shadow-sm border border-beige-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-brown-900">{project.name}</h3>
                <p className="text-sm text-brown-600">Échéance: {project.deadline}</p>
              </div>
              <div className="flex flex-col space-y-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-brown-600">Progression</span>
                <span className="font-medium text-brown-900">{project.progress}%</span>
              </div>
              <div className="w-full bg-beige-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${
                    project.progress === 100 ? 'bg-green-500' :
                    project.progress >= 75 ? 'bg-blue-500' :
                    project.progress >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Team Members */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-brown-600">Équipe:</span>
                <div className="flex -space-x-2">
                  {project.team.map((member, index) => (
                    <div 
                      key={index}
                      className="w-8 h-8 bg-brown-600 rounded-full flex items-center justify-center border-2 border-white"
                    >
                      <span className="text-white text-xs font-medium">{member}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button className="px-4 py-2 text-sm bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors">
                Voir détails
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectsManagement;