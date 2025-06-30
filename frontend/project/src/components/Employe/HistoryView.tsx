import React, { useEffect, useState } from "react";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Briefcase,
  BookOpen,
  Coffee,
  UserX,
  Settings,
  Edit3,
  Clock,
  Calendar,
  Trash2,
} from "lucide-react";
import { eachDayOfInterval, format } from "date-fns";
import { fr } from "date-fns/locale";
import { fetchGlobalRulesApi } from "../../services/api";
import type { GlobalRules, CountryHolidays } from "../../types";

const activityTypes = [
  { id: "projet", label: "Travail sur projet", icon: Briefcase, color: "amber", bgColor: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-700" },
  { id: "formation", label: "Formation", icon: BookOpen, color: "emerald", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", textColor: "text-emerald-700" },
  { id: "reunion", label: "Réunion", icon: Coffee, color: "orange", bgColor: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-700" },
  { id: "absence", label: "Absence", icon: UserX, color: "red", bgColor: "bg-red-50", borderColor: "border-red-200", textColor: "text-red-700" },
  { id: "admin", label: "Tâches administratives", icon: Settings, color: "purple", bgColor: "bg-purple-50", borderColor: "border-purple-200", textColor: "text-purple-700" },
  { id: "autre", label: "Autre", icon: Edit3, color: "slate", bgColor: "bg-slate-50", borderColor: "border-slate-200", textColor: "text-slate-700" },
];

const HistoryView: React.FC = () => {
  const [globalRules, setGlobalRules] = useState<GlobalRules | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<{ [date: string]: any[] }>({});
  const [expandedDays, setExpandedDays] = useState<{ [date: string]: boolean }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const rules = await fetchGlobalRulesApi();
        setGlobalRules(rules);

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const weekDays = eachDayOfInterval({ 
          start: startOfWeek, 
          end: endOfWeek 
        });
        
        setCurrentWeek(weekDays);
      } catch (error) {
        console.error("Erreur chargement des règles:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const isWorkingDay = (date: Date) => {
    if (!globalRules) return false;
    
    const dayName = format(date, "EEEE", { locale: fr }).toLowerCase();
    const dateStr = format(date, "yyyy-MM-dd");
    
    const isFerie = globalRules.jours_feries?.some(
      (holiday: CountryHolidays) => holiday.date === dateStr
    );
    
    return globalRules.jours_ouvrables.includes(dayName) && !isFerie;
  };

  const addActivity = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const newActivity = {
      id: Date.now() + Math.random(),
      type: "projet",
      description: "",
      startTime: globalRules?.heure_debut_travail || "08:00",
      endTime: globalRules?.heure_fin_travail || "17:00",
    };
    setActivities((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newActivity],
    }));
  };

  const updateActivity = (
    date: Date,
    activityId: number,
    field: string,
    value: string
  ) => {
    const dateKey = format(date, "yyyy-MM-dd");
    setActivities((prev) => ({
      ...prev,
      [dateKey]:
        prev[dateKey]?.map((activity) =>
          activity.id === activityId ? { ...activity, [field]: value } : activity
        ) || [],
    }));
  };

  const removeActivity = (date: Date, activityId: number) => {
    const dateKey = format(date, "yyyy-MM-dd");
    setActivities((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey]?.filter((activity) => activity.id !== activityId) || [],
    }));
  };

  const calculateActivityHours = (activity: any) => {
    if (!activity.startTime || !activity.endTime) return 0;
    
    const [startHours, startMinutes] = activity.startTime.split(":").map(Number);
    const [endHours, endMinutes] = activity.endTime.split(":").map(Number);
    
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    
    return Math.max(0, (endTotal - startTotal) / 60);
  };

  const toggleDayExpansion = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const getDayStatus = (date: Date) => {
    if (!globalRules) return "loading";
    
    const dayName = format(date, "EEEE", { locale: fr }).toLowerCase();
    const dateStr = format(date, "yyyy-MM-dd");
    
    const isFerie = globalRules.jours_feries?.some(
      (holiday: CountryHolidays) => holiday.date === dateStr
    );
    
    if (isFerie) return "ferie";
    if (!globalRules.jours_ouvrables.includes(dayName)) return "weekend";
    return "working";
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <div className="text-amber-700 text-lg font-medium">Chargement en cours...</div>
      </div>
    </div>
  );

  if (!globalRules) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
      <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-red-500 text-lg font-medium">Erreur lors du chargement des règles de travail</div>
      </div>
    </div>
  );

  const totalWeekHours = currentWeek.reduce((total, day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayActivities = activities[dateKey] || [];
    return total + dayActivities.reduce((sum, a) => sum + calculateActivityHours(a), 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4 shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-3">
            Saisie des heures hebdomadaires
          </h1>
          <div className="bg-white/80 backdrop-blur-sm inline-block px-6 py-3 rounded-2xl shadow-lg border border-amber-200">
            <div className="flex items-center space-x-4 text-amber-700">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  {globalRules.heure_debut_travail} - {globalRules.heure_fin_travail}
                </span>
              </div>
              {globalRules.pause_midi_debut && (
                <div className="flex items-center space-x-2">
                  <Coffee className="w-4 h-4" />
                  <span className="text-sm">
                    Pause: {globalRules.pause_midi_debut}-{globalRules.pause_midi_fin}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-amber-200 max-w-md mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-700">{totalWeekHours.toFixed(1)}h</div>
              <div className="text-sm text-amber-600">Total cette semaine</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {currentWeek.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayName = format(day, "EEEE", { locale: fr });
            const dayStatus = getDayStatus(day);
            const dayActivities = activities[dateKey] || [];
            const isExpanded = expandedDays[dateKey] || false;
            const isWorking = dayStatus === "working";
            const dayTotal = dayActivities.reduce((sum, a) => sum + calculateActivityHours(a), 0);

            return (
              <div
                key={dateKey}
                className={`rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${
                  isWorking
                    ? "bg-white/90 backdrop-blur-sm border border-amber-200 hover:border-amber-300"
                    : "bg-gray-50/80 backdrop-blur-sm border border-gray-200"
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
                        isWorking 
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" 
                          : "bg-gray-200 text-gray-600"
                      }`}>
                        <span className="text-lg font-bold">{format(day, "d")}</span>
                      </div>
                      <div>
                        <h3 className={`text-xl font-semibold ${
                          isWorking ? "text-amber-800" : "text-gray-600"
                        }`}>
                          {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm ${
                            isWorking ? "text-amber-600" : "text-gray-500"
                          }`}>
                            {dayStatus === "ferie" 
                              ? "Jour férié" 
                              : dayStatus === "weekend" 
                                ? "Week-end" 
                                : "Jour travaillé"}
                          </p>
                          {isWorking && dayTotal > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              {dayTotal.toFixed(1)}h
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isWorking && (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleDayExpansion(day)}
                          className="p-3 rounded-xl hover:bg-amber-100 transition-colors duration-200 group"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-amber-600 group-hover:text-amber-700" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-amber-600 group-hover:text-amber-700" />
                          )}
                        </button>
                        <button
                          onClick={() => addActivity(day)}
                          className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="font-medium">Ajouter</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isWorking && isExpanded && (
                    <div className="mt-6 space-y-4">
                      {dayActivities.length === 0 ? (
                        <div className="text-center py-8 bg-amber-25 rounded-xl border-2 border-dashed border-amber-200">
                          <Clock className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                          <div className="text-amber-500 font-medium">Aucune activité enregistrée</div>
                          <div className="text-amber-400 text-sm mt-1">Cliquez sur "Ajouter" pour commencer</div>
                        </div>
                      ) : (
                        dayActivities.map((activity) => {
                          const activityType = activityTypes.find(t => t.id === activity.type) || activityTypes[0];
                          const Icon = activityType.icon;
                          const hours = calculateActivityHours(activity);

                          return (
                            <div
                              key={activity.id}
                              className={`p-4 rounded-xl shadow-sm border-l-4 bg-white hover:shadow-md transition-all duration-200 ${activityType.borderColor}`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className={`p-2 rounded-lg ${activityType.bgColor}`}>
                                    <Icon className={`w-5 h-5 ${activityType.textColor}`} />
                                  </div>
                                  <select
                                    value={activity.type}
                                    onChange={(e) => updateActivity(day, activity.id, "type", e.target.value)}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                                  >
                                    {activityTypes.map((type) => (
                                      <option key={type.id} value={type.id}>{type.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  onClick={() => removeActivity(day, activity.id)}
                                  className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <textarea
                                value={activity.description}
                                onChange={(e) => updateActivity(day, activity.id, "description", e.target.value)}
                                placeholder="Description de l'activité..."
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors resize-none"
                                rows={2}
                              />
                              
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2 flex-1">
                                  <input
                                    type="time"
                                    value={activity.startTime}
                                    onChange={(e) => updateActivity(day, activity.id, "startTime", e.target.value)}
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                                  />
                                  <span className="text-gray-400 font-medium">→</span>
                                  <input
                                    type="time"
                                    value={activity.endTime}
                                    onChange={(e) => updateActivity(day, activity.id, "endTime", e.target.value)}
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                                  />
                                </div>
                                <div className="flex items-center space-x-1 bg-amber-50 px-3 py-2 rounded-lg">
                                  <Clock className="w-4 h-4 text-amber-600" />
                                  <span className="text-sm font-semibold text-amber-700">
                                    {hours.toFixed(1)}h
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {isWorking && dayActivities.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold text-amber-700">
                          Total journée: {dayTotal.toFixed(1)} heures
                        </span>
                      </div>
                      <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105">
                        <CheckCircle className="w-5 h-5" />
                        <span>Enregistrer</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-amber-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-700">{totalWeekHours.toFixed(1)}h</div>
              <div className="text-sm text-amber-600">Heures saisies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">
                {currentWeek.filter(day => getDayStatus(day) === "working").length}
              </div>
              <div className="text-sm text-emerald-600">Jours ouvrables</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-700">
                {Object.values(activities).flat().length}
              </div>
              <div className="text-sm text-orange-600">Activités total</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;