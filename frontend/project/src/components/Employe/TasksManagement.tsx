import { useState } from 'react';
import * as React from 'react';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const TasksManagement: React.FC = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Rapport mensuel', description: 'Préparer le rapport d\'activité mensuel', status: 'En cours', priority: 'Haute', deadline: '2024-01-15', progress: 60 },
    { id: 2, title: 'Formation sécurité', description: 'Compléter le module de formation sécurité', status: 'Terminé', priority: 'Moyenne', deadline: '2024-01-10', progress: 100 },
    { id: 3, title: 'Réunion équipe', description: 'Préparer la présentation pour la réunion', status: 'À faire', priority: 'Basse', deadline: '2024-01-20', progress: 0 },
    { id: 4, title: 'Mise à jour documentation', description: 'Mettre à jour la documentation technique', status: 'En cours', priority: 'Moyenne', deadline: '2024-01-18', progress: 30 },
    { id: 5, title: 'Test nouvelle fonctionnalité', description: 'Tester et valider la nouvelle fonctionnalité', status: 'À faire', priority: 'Haute', deadline: '2024-01-22', progress: 0 }
  ]);

  const stats = [
    { icon: FileText, label: 'Total tâches', value: tasks.length.toString(), color: 'text-blue-600' },
    { icon: CheckCircle, label: 'Terminées', value: tasks.filter(t => t.status === 'Terminé').length.toString(), color: 'text-green-600' },
    { icon: Clock, label: 'En cours', value: tasks.filter(t => t.status === 'En cours').length.toString(), color: 'text-orange-600' },
    { icon: AlertCircle, label: 'À faire', value: tasks.filter(t => t.status === 'À faire').length.toString(), color: 'text-red-600' }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Haute': return 'bg-red-100 text-red-800';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-800';
      case 'Basse': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Terminé': return 'bg-green-100 text-green-800';
      case 'En cours': return 'bg-blue-100 text-blue-800';
      case 'À faire': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const updateTaskStatus = (taskId: number, newStatus: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: newStatus, progress: newStatus === 'Terminé' ? 100 : task.progress }
        : task
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Mes tâches</h1>
        <p className="text-brown-100 mt-2">
          Gérez et suivez l'avancement de vos tâches
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

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white rounded-xl p-6 shadow-sm border border-beige-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-brown-900">{task.title}</h3>
                <p className="text-brown-600 mt-1">{task.description}</p>
                <p className="text-sm text-brown-500 mt-2">Échéance: {task.deadline}</p>
              </div>
              
              <div className="flex flex-col space-y-2 ml-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-brown-600">Progression</span>
                <span className="font-medium text-brown-900">{task.progress}%</span>
              </div>
              <div className="w-full bg-beige-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    task.progress === 100 ? 'bg-green-500' :
                    task.progress >= 50 ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              {task.status !== 'Terminé' && (
                <>
                  {task.status === 'À faire' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'En cours')}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Commencer
                    </button>
                  )}
                  {task.status === 'En cours' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'Terminé')}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Terminer
                    </button>
                  )}
                </>
              )}
              <button className="px-4 py-2 text-sm bg-brown-100 text-brown-700 rounded-lg hover:bg-brown-200 transition-colors">
                Voir détails
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksManagement;