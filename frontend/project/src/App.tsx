// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import MainLayout from './components/Layout/MainLayout';
import ChangePassword from './components/Auth/ChangePassword';
import ResetPasswordRequest from './components/Auth/ResetPasswordRequest';
import ResetPasswordConfirm from './components/Auth/ResetPasswordConfirm';
import GlobalRulesConfig from './components/Admin/GlobalRulesConfig';
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/reset-password" element={<ResetPasswordRequest />} />
          <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />
          {/* Les dashboards */}
          <Route path="/admin/dashboard" element={<MainLayout />} />
          <Route path="/admin/global-rules" element={<GlobalRulesConfig />} />
          <Route path="/manager/dashboard" element={<MainLayout />} />
          <Route path="/employee/dashboard" element={<MainLayout />} />
          {/* Route par défaut */}
          <Route path="*" element={<LoginForm />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
