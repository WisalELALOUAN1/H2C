import  { useState } from 'react';
import * as React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

// Import des composants de contenu
import EmployeeDashboard from '../Dashboard/EmployeeDashboard';
import ManagerDashboard from '../Dashboard/ManagerDashboard';
import AdminDashboard from '../Dashboard/AdminDashboard';
import GlobalRulesConfig from '../Admin/GlobalRulesConfig';
import TeamsCreation from '../Admin/TeamsCreation.tsx';
import TeamManagement from '../Manager/TeamManagement.tsx';
import ProjectsManagement from '../Manager/ProjectsManagement.tsx';
import TasksManagement from '../Employe/TasksManagement.tsx';
import TimesheetManagement from '../Employe/TimesheetManagement.tsx';
import EmployeeAbsenceDashboard from '../Employe/EmployeeAbsenceDashboard';
import SettingsView from '../Shared/SettingsView.tsx';
import ManagerPendingRequests from '../Manager/ManagerPendingRequests.tsx';
import RegleCongeManager from '../Manager/RegleConge';
import CalendarView from '../Employe/CalendarView.tsx';
import AdminSoldeHistory from '../Admin/AdminSoldeHistory';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  console.log('Utilisateur connecté:', user);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Normalize role
  const normalizedRole = user?.role ? user.role.toLowerCase() : '';

  const renderContent = () => {
    // Contenu basé sur le rôle et la section active
    if (activeSection === 'dashboard') {
      switch (normalizedRole) {
        case 'admin':
          return <AdminDashboard />;
        case 'manager':
          return <ManagerDashboard />;
        case 'employe':
          return <EmployeeDashboard />;
        default:
          return <div>Rôle non reconnu&nbsp;: <b>{user?.role || 'Non défini'}</b></div>;
      }
    }

    // Navigation spécifique par rôle
    switch (normalizedRole) {
      case 'admin':
        switch (activeSection) {
          case 'teams':
            return <TeamsCreation />;
          case 'settings':
            return <SettingsView />;
          case 'solde-history':
            return <AdminSoldeHistory />;
          
          case "global-rules":
            return <GlobalRulesConfig />;
          default:
            return <div className="p-6 text-center text-brown-600">Section en développement</div>;
        }
      case 'manager':
        switch (activeSection) {
          case 'team':
            return <TeamManagement />;
          
          
          case 'requests':
            return <ManagerPendingRequests />;
          case 'leave-rules':
            return <RegleCongeManager />;
          case 'settings':
            return <SettingsView />;
          default:
            return <div className="p-6 text-center text-brown-600">Section en développement</div>;
        }
      case 'employe':
      case 'employee':
        switch (activeSection) {
          case 'tasks':
            return <TasksManagement />;
          case 'timesheet':
            return <TimesheetManagement />;
          case 'calendar':
            return <CalendarView />;
          case 'absences':
            return <EmployeeAbsenceDashboard />;
          case 'settings':
            return <SettingsView />;
          default:
            return <div className="p-6 text-center text-brown-600">Section en développement</div>;
        }
      default:
        return <div className="p-6 text-center text-brown-600">Accès non autorisé (role: <b>{user?.role || 'Non défini'}</b>)</div>;
    }
  };

  return (
    <div className="min-h-screen bg-beige-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${isSidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300`}>
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isCollapsed={isSidebarCollapsed}
        />
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${isSidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        <Header
          onToggleSidebar={toggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="fade-in">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default MainLayout;
