
import * as React from 'react';
import { Navigate, Outlet } from "react-router-dom"
import { useLocation } from "react-router-dom"
const isAuthenticated = () => {
  const token = localStorage.getItem('accessToken');
  return !!token;
};

interface ProtectedRouteProps {
  allowedRoles?: string[]; // Roles autorises
  redirectPath?: string; // Chemin de redirection 
}


 
const ProtectedRoute = ({ 
  allowedRoles, 
  redirectPath = '/login' 
}: ProtectedRouteProps) => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null'); // recupere l'utilisateur


  if (!isAuthenticated()) {
    // Redirection vers login avec l'emplacement precedent
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // verifier le role
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role?.toLowerCase();
    const hasRequiredRole = allowedRoles.some(role => 
      role.toLowerCase() === userRole
    );

    if (!hasRequiredRole) {
      // Redirection vers not-found si mauvais role
      return <Navigate to="/not-found" replace />;
    }
  }

  // 3. Rend les enfants si tout est OK
  return <Outlet />;
};

export default ProtectedRoute;