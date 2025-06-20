import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('accessToken');
    console.log("Chargement du user depuis localStorage:", storedUser);
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, []);

  const login = async (email: string, password: string) => {
  setIsLoading(true);
  try {
    const response = await fetch('http://localhost:8000/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    console.log("Réponse du backend:", data);

    if (response.ok && data.access && data.user) {
      setUser(data.user);
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      setIsLoading(false);
      return { user: data.user, access: data.access, refresh: data.refresh };
    } else if (response.ok && data.first_login) {
      setIsLoading(false);
      return { first_login: true, message: data.message, email };
    } else {
      setIsLoading(false);
      // Nouvelle gestion d’erreurs : on vérifie toutes les possibilités connues
      if (data?.error) return data.error;
      if (data?.non_field_errors && data.non_field_errors.length) return data.non_field_errors[0];
      if (typeof data?.detail === "string") return data.detail;
      return "Erreur inconnue";
    }
  } catch (error) {
    setIsLoading(false);
    return "Erreur technique, vérifiez la connexion.";
  }
};

  const refreshUser = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    const res = await fetch("http://localhost:8000/auth/user/profile/", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      localStorage.setItem("currentUser", JSON.stringify(data));
    }
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

