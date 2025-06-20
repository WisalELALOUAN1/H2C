import React from 'react';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';

const CalendarView: React.FC = () => {
  const events = [
    { id: 1, title: 'Réunion équipe', time: '09:00', duration: '1h', type: 'meeting', attendees: 5 },
    { id: 2, title: 'Formation React', time: '14:00', duration: '2h', type: 'training', attendees: 8 },
    { id: 3, title: 'Présentation client', time: '16:00', duration: '1h30', type: 'presentation', attendees: 3 },
    { id: 4, title: 'Point projet', time: '10:30', duration: '30min', type: 'meeting', attendees: 4 }
  ];

  const upcomingEvents = [
    { id: 5, title: 'Réunion mensuelle', date: 'Demain', time: '10:00', type: 'meeting' },
    { id: 6, title: 'Formation sécurité', date: 'Jeudi', time: '14:00', type: 'training' },
    { id: 7, title: 'Entretien annuel', date: 'Vendredi', time: '15:00', type: 'review' }
  ];

  const getEventColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'training': return 'bg-green-100 text-green-800 border-green-200';
      case 'presentation': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'review': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Calendrier</h1>
        <p className="text-brown-100 mt-2">
          Gérez vos événements et rendez-vous
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Events */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-beige-200">
          <h3 className="text-lg font-semibold text-brown-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Aujourd'hui - 15 Janvier 2024
          </h3>
          
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className={`p-4 rounded-lg border ${getEventColor(event.type)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{event.title}</h4>
                    <div className="flex items-center space-x-4 mt-2 text-sm opacity-75">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {event.time} ({event.duration})
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {event.attendees} participants
                      </div>
                    </div>
                  </div>
                  <button className="px-3 py-1 text-xs bg-white bg-opacity-50 rounded-full hover:bg-opacity-75 transition-colors">
                    Rejoindre
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-beige-200">
          <h3 className="text-lg font-semibold text-brown-900 mb-4">Événements à venir</h3>
          
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="p-3 bg-beige-50 rounded-lg">
                <h4 className="font-medium text-brown-900">{event.title}</h4>
                <div className="flex justify-between items-center mt-2 text-sm text-brown-600">
                  <span>{event.date}</span>
                  <span>{event.time}</span>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-4 px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors">
            Voir tout le calendrier
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-beige-200">
        <h3 className="text-lg font-semibold text-brown-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center space-x-2 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            <Calendar className="h-5 w-5" />
            <span>Nouvel événement</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            <Users className="h-5 w-5" />
            <span>Planifier réunion</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
            <MapPin className="h-5 w-5" />
            <span>Réserver salle</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;