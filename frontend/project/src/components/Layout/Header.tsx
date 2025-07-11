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
    navigate("/") 
  }

  return (
    <header className="bg-white shadow-md border-b border-brown-200 sticky top-0 z-40 backdrop-blur-sm bg-white/95">
      <div className="flex justify-between items-center h-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-6">
          <button
            onClick={onToggleSidebar}
            className="p-2.5 rounded-xl text-brown-600 hover:bg-brown-100 hover:text-brown-800 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {isSidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-brown-900 tracking-tight">Espace de travail</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-3 text-brown-700">
            <div className="flex flex-col items-end">
              <span className="font-semibold text-brown-900 text-sm leading-tight">
                {user?.prenom} {user?.nom}
              </span>
              
            </div>
          </div>
          
          <div className="h-8 w-px bg-brown-200 hidden sm:block"></div>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2.5 text-brown-600 hover:text-brown-800 hover:bg-brown-100 rounded-xl transition-all duration-200 hover:shadow-sm active:scale-95 font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header