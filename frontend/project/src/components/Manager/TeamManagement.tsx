import * as React from 'react';
import { Users, TrendingUp, Calendar, Award } from 'lucide-react';

const TeamManagement: React.FC = () => {
  const teamMembers = [
    { id: 1, name: 'Marie Dubois', role: 'Développeur', status: 'Actif', performance: 95, avatar: 'MD' },
    { id: 2, name: 'Pierre Martin', role: 'Designer', status: 'Actif', performance: 88, avatar: 'PM' },
    { id: 3, name: 'Sophie Durand', role: 'Analyste', status: 'Congé', performance: 92, avatar: 'SD' },
    { id: 4, name: 'Thomas Leroy', role: 'Développeur', status: 'Actif', performance: 79, avatar: 'TL' },
    { id: 5, name: 'Emma Rousseau', role: 'Chef de projet', status: 'Actif', performance: 91, avatar: 'ER' },
    { id: 6, name: 'Lucas Bernard', role: 'Testeur', status: 'Actif', performance: 85, avatar: 'LB' }
  ];

  const stats = [
    { icon: Users, label: 'Membres équipe', value: teamMembers.length.toString(), color: 'text-blue-600' },
    { icon: TrendingUp, label: 'Performance moyenne', value: '87%', color: 'text-green-600' },
    { icon: Calendar, label: 'Présents aujourd\'hui', value: teamMembers.filter(m => m.status === 'Actif').length.toString(), color: 'text-purple-600' },
    { icon: Award, label: 'Top performers', value: teamMembers.filter(m => m.performance >= 90).length.toString(), color: 'text-orange-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Gestion d'équipe</h1>
        <p className="text-brown-100 mt-2">
          Suivez les performances et gérez votre équipe
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

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-xl p-6 shadow-sm border border-beige-200 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-brown-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">{member.avatar}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-brown-900">{member.name}</h3>
                <p className="text-sm text-brown-600">{member.role}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                member.status === 'Actif' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {member.status}
              </span>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brown-600">Performance</span>
                  <span className="font-medium text-brown-900">{member.performance}%</span>
                </div>
                <div className="w-full bg-beige-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      member.performance >= 90 ? 'bg-green-500' :
                      member.performance >= 80 ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${member.performance}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button className="flex-1 px-3 py-2 text-sm bg-brown-100 text-brown-700 rounded-lg hover:bg-brown-200 transition-colors">
                  Voir profil
                </button>
                <button className="flex-1 px-3 py-2 text-sm bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors">
                  Contacter
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamManagement;