"use client"

import * as React from 'react';
import { useState, useEffect } from "react"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Coffee,
  Briefcase,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { fetchCalendarDataApi, debugHolidaysApi } from "../../services/api"

interface CalendarEvent {
  id: number
  title: string
  date: string
  type: "holiday" | "leave" | "pending_leave" | "team_leave"
  status?: string
  description?: string
  isHalfDay?: boolean
  isTeamLeave?: boolean
  user?: {
    id: number
    name: string
    avatar?: string
  }
}

interface CalendarData {
  holidays: CalendarEvent[]
  leaves: CalendarEvent[]
  pendingLeaves: CalendarEvent[]
  teamLeaves: CalendarEvent[]
}

const CalendarView: React.FC = () => {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CalendarData>({
    holidays: [],
    leaves: [],
    pendingLeaves: [],
    teamLeaves: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    fetchCalendarData()
  }, [currentDate])

  const fetchCalendarData = async () => {
    setLoading(true)
    setError("")
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const data = await fetchCalendarDataApi(year, month)
      setCalendarData(data)
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du calendrier")
    } finally {
      setLoading(false)
    }
  }

  const handleDebugHolidays = async () => {
    try {
      const debug = await debugHolidaysApi()
      setDebugInfo(debug)
      setShowDebug(true)
    } catch (err: any) {
      setError(err.message || "Erreur lors du debug")
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        events: [],
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split("T")[0]

      const events = [
        ...calendarData.holidays.filter((h) => h.date === dateStr),
        ...calendarData.leaves.filter((l) => l.date === dateStr),
        ...calendarData.pendingLeaves.filter((p) => p.date === dateStr),
        ...calendarData.teamLeaves.filter((t) => t.date === dateStr),
      ]

      days.push({
        date,
        isCurrentMonth: true,
        events,
      })
    }

    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        events: [],
      })
    }

    return days
  }

  const getEventColor = (event: CalendarEvent) => {
    switch (event.type) {
      case "holiday":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "leave":
        if (event.status === "validé") return "bg-emerald-100 text-emerald-800 border-emerald-200"
        if (event.status === "refusé") return "bg-stone-100 text-stone-800 border-stone-200"
        return "bg-sky-100 text-sky-800 border-sky-200"
      case "pending_leave":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "team_leave":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-stone-100 text-stone-800 border-stone-200"
    }
  }

  const getEventIcon = (event: CalendarEvent) => {
    switch (event.type) {
      case "holiday":
        return <MapPin className="w-3 h-3" />
      case "leave":
        if (event.status === "validé") return <CheckCircle className="w-3 h-3" />
        if (event.status === "refusé") return <XCircle className="w-3 h-3" />
        return <Clock className="w-3 h-3" />
      case "pending_leave":
        return <Clock className="w-3 h-3" />
      case "team_leave":
        return <Briefcase className="w-3 h-3" />
      default:
        return <Calendar className="w-3 h-3" />
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const EventCard = ({ event }: { event: CalendarEvent }) => (
    <div className={`p-4 rounded-lg border ${getEventColor(event)}`}>
      <div className="flex items-start space-x-3">
        {event.isTeamLeave && event.user && (
          <div className="flex-shrink-0">
            {event.user.avatar ? (
              <img 
                src={event.user.avatar} 
                alt={event.user.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-medium">
                {event.user.name.charAt(0)}
              </div>
            )}
          </div>
        )}
        {!event.isTeamLeave && (
          <div className="flex-shrink-0 mt-1">
            {getEventIcon(event)}
          </div>
        )}
        <div className="flex-1">
          {event.isTeamLeave && event.user && (
            <h4 className="font-semibold text-purple-800 mb-1">
              {event.user.name}
            </h4>
          )}
          <div className="flex items-center">
            <span className="font-medium">
              {event.isHalfDay && (
                <span className="text-xs bg-white bg-opacity-50 px-1 rounded mr-1">½</span>
              )}
              {event.title.split(' - ').pop()}
            </span>
          </div>
          {event.description && (
            <p className="text-sm mt-1 text-stone-600">{event.description}</p>
          )}
          {event.status && (
            <div className="mt-2">
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                event.status === "validé" ? "bg-emerald-100 text-emerald-800" :
                event.status === "refusé" ? "bg-red-100 text-red-800" :
                "bg-orange-100 text-orange-800"
              }`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const days = getDaysInMonth()
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ]
  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

  const monthStats = {
    holidays: calendarData.holidays.length,
    approvedLeaves: calendarData.leaves.filter((l) => l.status === "validé").length,
    pendingLeaves: calendarData.pendingLeaves.length,
    rejectedLeaves: calendarData.leaves.filter((l) => l.status === "refusé").length,
    teamLeaves: calendarData.teamLeaves.length,
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4 mb-6 lg:mb-0">
              <div className="p-3 bg-amber-600 rounded-xl">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-800">Calendrier des congés</h1>
                <p className="text-amber-600 mt-1">
                  Visualisez vos congés et les jours fériés - {user?.prenom} {user?.nom}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
                  <div className="text-amber-600 text-sm font-medium">Jours fériés</div>
                  <div className="text-amber-800 text-xl font-bold">{monthStats.holidays}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
                  <div className="text-emerald-600 text-sm font-medium">Congés validés</div>
                  <div className="text-emerald-800 text-xl font-bold">{monthStats.approvedLeaves}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                  <div className="text-orange-600 text-sm font-medium">En attente</div>
                  <div className="text-orange-800 text-xl font-bold">{monthStats.pendingLeaves}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3 text-center border border-stone-200">
                  <div className="text-stone-600 text-sm font-medium">Refusés</div>
                  <div className="text-stone-800 text-xl font-bold">{monthStats.rejectedLeaves}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                  <div className="text-purple-600 text-sm font-medium">Congés équipe</div>
                  <div className="text-purple-800 text-xl font-bold">{monthStats.teamLeaves}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Modal */}
        {showDebug && debugInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="bg-amber-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Debug - Jours Fériés</h3>
                  <button
                    onClick={() => setShowDebug(false)}
                    className="p-2 hover:bg-amber-700 rounded-lg transition-colors text-white"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-stone-800 mb-2">Informations de base</h4>
                    <div className="bg-stone-50 p-4 rounded-lg">
                      <p>
                        <strong>Règles existent:</strong> {debugInfo.regles_exists ? "✅ Oui" : "❌ Non"}
                      </p>
                      <p>
                        <strong>Nombre de règles:</strong> {debugInfo.regles_count}
                      </p>
                      <p>
                        <strong>Type jours_feries:</strong> {debugInfo.jours_feries_type}
                      </p>
                      <p>
                        <strong>Pays:</strong> {debugInfo.pays_feries || "Non défini"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-stone-800 mb-2">Données brutes</h4>
                    <div className="bg-stone-50 p-4 rounded-lg">
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(debugInfo.jours_feries_raw, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {debugInfo.jours_feries_parsed && (
                    <div>
                      <h4 className="font-semibold text-stone-800 mb-2">Données parsées</h4>
                      <div className="bg-stone-50 p-4 rounded-lg">
                        <pre className="text-sm overflow-x-auto">
                          {JSON.stringify(debugInfo.jours_feries_parsed, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {debugInfo.parse_error && (
                    <div>
                      <h4 className="font-semibold text-red-800 mb-2">Erreur de parsing</h4>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <p className="text-red-700">{debugInfo.parse_error}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
          {/* Calendar Navigation */}
          <div className="bg-amber-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigateMonth("prev")}
                  className="p-2 hover:bg-amber-700 rounded-lg transition-colors text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={() => navigateMonth("next")}
                  className="p-2 hover:bg-amber-700 rounded-lg transition-colors text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition-colors font-medium"
              >
                Aujourd'hui
              </button>
            </div>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 bg-amber-50 border-b border-stone-200">
            {dayNames.map((day) => (
              <div
                key={day}
                className="p-4 text-center font-semibold text-amber-800 border-r border-stone-200 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
              <p className="text-amber-600 mt-4">Chargement du calendrier...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r border-b border-stone-100 last:border-r-0 ${
                    !day.isCurrentMonth ? "bg-stone-50" : "bg-white"
                  } ${isToday(day.date) ? "bg-amber-50 ring-2 ring-amber-300" : ""} ${
                    isWeekend(day.date) ? "bg-stone-25" : ""
                  } hover:bg-amber-25 transition-colors cursor-pointer`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="flex flex-col h-full">
                    {/* Day Number */}
                    <div
                      className={`text-sm font-medium mb-1 ${
                        !day.isCurrentMonth
                          ? "text-stone-400"
                          : isToday(day.date)
                            ? "text-amber-800 font-bold"
                            : isWeekend(day.date)
                              ? "text-stone-600"
                              : "text-stone-900"
                      }`}
                    >
                      {day.date.getDate()}
                    </div>

                    {/* Events */}
                    <div className="flex-1 space-y-1">
                      {day.events.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`text-xs px-2 py-1 rounded border flex items-center space-x-1 ${getEventColor(
                            event,
                          )}`}
                          title={`${event.isTeamLeave ? `${event.user?.name} - ` : ""}${event.title}${event.description ? ` - ${event.description}` : ""}`}
                        >
                          {getEventIcon(event)}
                          <span className="truncate flex-1">
                            {event.isHalfDay ? "½ " : ""}
                            {event.isTeamLeave ? `${event.user?.name.split(' ')[0]} - ` : ""}
                            {event.title.split(' - ').pop()}
                          </span>
                        </div>
                      ))}
                      {day.events.length > 3 && (
                        <div className="text-xs text-amber-600 font-medium">+{day.events.length - 3} autres</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-6">
          <h3 className="text-lg font-semibold text-stone-800 mb-4">Légende</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-amber-100 border border-amber-200 rounded"></div>
              <span className="text-sm text-stone-700">Jours fériés</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-emerald-100 border border-emerald-200 rounded"></div>
              <span className="text-sm text-stone-700">Congés validés</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
              <span className="text-sm text-stone-700">Congés en attente</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-stone-100 border border-stone-200 rounded"></div>
              <span className="text-sm text-stone-700">Congés refusés</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
              <span className="text-sm text-stone-700">Congés équipe</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-200">
            <div className="flex items-center space-x-4 text-sm text-stone-600">
              <div className="flex items-center space-x-1">
                <Coffee className="w-4 h-4" />
                <span>½ = Demi-journée</span>
              </div>
              <div className="flex items-center space-x-1">
                <Briefcase className="w-4 h-4" />
                <span>Cliquez sur un jour pour plus de détails</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Day Modal */}
        {selectedDate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="bg-amber-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {selectedDate.toLocaleDateString("fr-FR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-2 hover:bg-amber-700 rounded-lg transition-colors text-white"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                {(() => {
                  const dateStr = selectedDate.toISOString().split("T")[0]
                  const dayEvents = [
                    ...calendarData.holidays.filter((h) => h.date === dateStr),
                    ...calendarData.leaves.filter((l) => l.date === dateStr),
                    ...calendarData.pendingLeaves.filter((p) => p.date === dateStr),
                    ...calendarData.teamLeaves.filter((t) => t.date === dateStr),
                  ]

                  if (dayEvents.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                        <p className="text-stone-600">Aucun événement pour cette date</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      {dayEvents
                        .filter(e => e.type === "holiday")
                        .map((event, index) => (
                          <EventCard key={`holiday-${index}`} event={event} />
                        ))}

                      {dayEvents
                        .filter(e => e.type === "leave" && e.status === "validé")
                        .map((event, index) => (
                          <EventCard key={`approved-${index}`} event={event} />
                        ))}

                      {dayEvents
                        .filter(e => e.type === "team_leave")
                        .map((event, index) => (
                          <EventCard key={`team-${index}`} event={event} />
                        ))}

                      {dayEvents
                        .filter(e => e.type === "pending_leave" || e.status === "en attente")
                        .map((event, index) => (
                          <EventCard key={`pending-${index}`} event={event} />
                        ))}

                      {dayEvents
                        .filter(e => e.status === "refusé")
                        .map((event, index) => (
                          <EventCard key={`rejected-${index}`} event={event} />
                        ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CalendarView