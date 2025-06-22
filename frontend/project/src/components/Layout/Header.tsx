"use client"
import * as React from 'react';
import { LogOut, Menu, X } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useNavigate } from "react-router-dom"

interface HeaderProps {
  onToggleSidebar: () => void
  isSidebarCollapsed: boolean
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/") // ou navigate('/login') selon ta route de login
  }

  return (
    <header className="bg-white shadow-sm border-b border-brown-200 sticky top-0 z-40">
      <div className="flex justify-between items-center h-16 px-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-brown-600 hover:bg-brown-100 transition-colors"
          >
            {isSidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold text-brown-900">Espace de travail</h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-brown-700">
            <span className="font-medium">
              {user?.prenom} {user?.nom}
            </span>
            <span className="px-2 py-1 bg-brown-100 text-brown-800 text-xs rounded-full capitalize">{user?.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 px-3 py-2 text-brown-600 hover:text-brown-800 hover:bg-brown-100 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
