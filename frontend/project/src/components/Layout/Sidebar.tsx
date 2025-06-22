"use client"

import * as React from 'react';
import {
  Home,
  Users,
  BarChart3,
  Settings,
  Calendar,
  FileText,
  Target,
  Shield,
  Clock,
  TrendingUp,
  Bookmark,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isCollapsed: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, isCollapsed }) => {
  const { user } = useAuth()

  const getMenuItems = () => {
    const baseItems = [{ id: "dashboard", label: "Tableau de bord", icon: Home }]

    switch (user?.role) {
      case "admin":
        return [
          ...baseItems,
          { id: "teams", label: "Gestion équipes", icon: Users },
          { id: "analytics", label: "Analytiques", icon: BarChart3 },
          { id: "global-rules", label: "Règles globales", icon: Target },
          { id: "settings", label: "Paramètres", icon: Settings },
          { id: "security", label: "Sécurité", icon: Shield },
        ]
      case "manager":
        return [
          ...baseItems,
          { id: "team", label: "Mon équipe", icon: Users },
          { id: "leave-rules", label: "Règles de congé", icon: Bookmark },
          { id: "projects", label: "Projets", icon: Target },
          { id: "reports", label: "Rapports", icon: BarChart3 },
          { id: "calendar", label: "Calendrier", icon: Calendar },
          { id: "settings", label: "Paramètres", icon: Settings },
          { id: "requests", label: "Demandes d'absence", icon: FileText },
        ]
      case "employe":
        return [
          ...baseItems,
          { id: "tasks", label: "Mes tâches", icon: FileText },
          { id: "timesheet", label: "Feuille de temps", icon: Clock },
          { id: "performance", label: "Performance", icon: TrendingUp },
          { id: "settings", label: "Paramètres", icon: Settings },
          { id: "absences", label: "Mes absences", icon: Calendar },
          { id: "calendar", label: "Calendrier", icon: Calendar },
        ]
      default:
        return baseItems
    }
  }

  const menuItems = getMenuItems()

  return (
    <div
      className={`bg-white shadow-lg border-r border-brown-200 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      } flex flex-col h-full`}
    >
      {/* Logo/Brand */}
      <div className="p-4 border-b border-brown-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-brown-600 rounded-lg flex items-center justify-center">
            <Home className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-bold text-brown-900">Dashboard</h2>
              <p className="text-xs text-brown-600 capitalize">{user?.role}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-brown-100 text-brown-900 border-l-4 border-brown-600"
                      : "text-brown-600 hover:bg-brown-50 hover:text-brown-900"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-brown-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-brown-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.prenom?.[0]}
                {user?.nom?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brown-900 truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-brown-600 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
