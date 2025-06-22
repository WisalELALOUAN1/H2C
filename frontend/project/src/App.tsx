// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import ChangePassword from './components/Auth/ChangePassword';
import ResetPasswordRequest from './components/Auth/ResetPasswordRequest';
import ResetPasswordConfirm from './components/Auth/ResetPasswordConfirm';
import MainLayout from './components/Layout/MainLayout';
import GlobalRulesConfig from './components/Admin/GlobalRulesConfig';
import NotFound from './components/Shared/NotFound';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Routes publiques */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/reset-password" element={<ResetPasswordRequest />} />
          <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />

          {/* Dashboards (à protéger avec ProtectedRoute dans le futur) */}
          <Route path="/admin/dashboard" element={<MainLayout />} />
          <Route path="/admin/global-rules" element={<GlobalRulesConfig />} />
          <Route path="/manager/dashboard" element={<MainLayout />} />
          <Route path="/employee/dashboard" element={<MainLayout />} />

          {/* Page Not Found */}
          <Route path="/not-found" element={<NotFound />} />

          {/* Redirection vers /login par défaut */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch-all vers NotFound */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
