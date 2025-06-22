import { useState } from 'react';
import * as React from 'react';
import { Clock, Calendar, Plus, Edit } from 'lucide-react';

const TimesheetManagement: React.FC = () => {
  const [timeEntries, setTimeEntries] = useState([
    { id: 1, date: '2024-01-15', project: 'Site Web Client A', hours: 8, description: 'Développement frontend' },
    { id: 2, date: '2024-01-14', project: 'App Mobile B', hours: 6, description: 'Tests et debugging' },
    { id: 3, date: '2024-01-13', project: 'Formation', hours: 4, description: 'Formation React avancé' },
    { id: 4, date: '2024-01-12', project: 'Site Web Client A', hours: 7, description: 'Intégration API' },
    { id: 5, date: '2024-01-11', project: 'Réunions', hours: 2, description: 'Réunion équipe et planning' }
  ]);

  const currentWeekHours = timeEntries.reduce((total, entry) => total + entry.hours, 0);
  const targetHours = 40;
  const averageHours = currentWeekHours / 5;

  const stats = [
    { icon: Clock, label: 'Heures cette semaine', value: `${currentWeekHours}h`, color: 'text-blue-600' },
    { icon: Calendar, label: 'Heures moyennes/jour', value: `${averageHours.toFixed(1)}h`, color: 'text-green-600' },
    { icon: Clock, label: 'Objectif hebdomadaire', value: `${targetHours}h`, color: 'text-purple-600' },
    { icon: Calendar, label: 'Jours travaillés', value: '5', color: 'text-orange-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Feuille de temps</h1>
        <p className="text-brown-100 mt-2">
          Suivez et gérez vos heures de travail
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

      {/* Progress towards weekly goal */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-beige-200">
        <h3 className="text-lg font-semibold text-brown-900 mb-4">Progression hebdomadaire</h3>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-brown-600">Heures travaillées</span>
          <span className="font-medium text-brown-900">{currentWeekHours}h / {targetHours}h</span>
        </div>
        <div className="w-full bg-beige-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full ${
              currentWeekHours >= targetHours ? 'bg-green-500' :
              currentWeekHours >= targetHours * 0.8 ? 'bg-blue-500' :
              'bg-yellow-500'
            }`}
            style={{ width: `${Math.min((currentWeekHours / targetHours) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Time Entries */}
      <div className="bg-white rounded-xl shadow-sm border border-beige-200">
        <div className="p-6 border-b border-beige-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-brown-900">Entrées de temps</h3>
            <button className="flex items-center space-x-2 px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors">
              <Plus className="h-4 w-4" />
              <span>Nouvelle entrée</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-beige-200">
            <thead className="bg-beige-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                  Projet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                  Heures
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-beige-200">
              {timeEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-beige-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-900">
                    {entry.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-brown-100 text-brown-800 text-xs rounded-full">
                      {entry.project}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brown-900">
                    {entry.hours}h
                  </td>
                  <td className="px-6 py-4 text-sm text-brown-600 max-w-xs truncate">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-brown-600 hover:text-brown-900">
                      <Edit className="h-4 w-4" />
                    </button>
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

export default TimesheetManagement;