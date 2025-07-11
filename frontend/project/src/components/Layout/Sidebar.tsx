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
  History,
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
          { id: "solde-history", label: "Historique soldes", icon: History },
         
        ]
      case "manager":
        return [
          ...baseItems,
          
          { id: "leave-rules", label: "Règles de congé", icon: Bookmark },
          { id: "requests", label: "Demandes d'absence", icon: FileText },
          { id: "projects", label: "Projets", icon: Target },
          { id: "settings", label: "Paramètres", icon: Settings },
         
          
          
          
          
        ]
      case "employe":
        return [
          ...baseItems,
        
          { id: "absences", label: "Mes absences", icon: Calendar },
          { id: "calendar", label: "Calendrier", icon: Calendar },
           { id: "settings", label: "Paramètres", icon: Settings },
         
         
         
           { id: "history", label: "Feuille de temps ", icon: Clock },
         
         
          
        ]
      default:
        return baseItems
    }
  }

  const menuItems = getMenuItems()

  return (
    <div
      className={`bg-white shadow-xl border-r border-brown-200 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-64"
      } flex flex-col h-full backdrop-blur-sm bg-white/98`}
    >
     
      <div className="p-5 border-b border-brown-200 bg-gradient-to-r from-brown-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brown-600 to-brown-700 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <Home className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-brown-900 tracking-tight">Dashboard</h2>
              
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-brown-100 to-brown-50 text-brown-900 shadow-sm border-l-4 border-brown-600 transform scale-[1.02]"
                      : "text-brown-600 hover:bg-brown-50 hover:text-brown-900 hover:shadow-sm hover:scale-[1.01]"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={`flex items-center justify-center w-6 h-6 transition-transform duration-200 ${
                    isActive ? "scale-110" : "group-hover:scale-105"
                  }`}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                  </div>
                  {!isCollapsed && (
                    <span className="font-medium text-sm truncate transition-all duration-200">
                      {item.label}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-brown-600/5 to-transparent pointer-events-none"></div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-brown-200 bg-gradient-to-r from-brown-50 to-white">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white shadow-sm border border-brown-100 hover:shadow-md transition-shadow duration-200">
            <div className="w-10 h-10 bg-gradient-to-br from-brown-600 to-brown-700 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">
                {user?.prenom?.[0]}
                {user?.nom?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brown-900 truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-brown-600 truncate font-medium">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar