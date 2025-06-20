// LoginForm.tsx
import React, { useState } from 'react';
import { LogIn, Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { LoginResult } from '../../types';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setIsLoading(true);
    const result: LoginResult = await login(email, password);
    setIsLoading(false);

    // Première connexion :
    if (typeof result === 'object' && 'first_login' in result) {
      localStorage.setItem('firstLoginEmail', result.email);
      navigate('/change-password', { state: { email: result.email, message: result.message } });
      return;
    }
    // Connexion normale :
    if (typeof result === 'object' && 'user' in result) {
      const role = result.user.role;
      if (role === 'admin') {
        window.location.href = '/admin/dashboard'; // Forcer le reload pour le contexte
      } else if (role === 'manager') {
        window.location.href = '/manager/dashboard';
      } else if (role === 'employe' || role === 'employee') {
        window.location.href = '/employee/dashboard';
      } else {
        window.location.href = '/';
      }
      return;
    }
    // Sinon erreur
    if (typeof result === 'string') {
      setError(result);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-beige-50 to-brown-50 p-4">
      {/* Éléments décoratifs en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-brown-400/20 to-amber-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-400/20 to-brown-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Carte principale avec effet glassmorphism */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header avec gradient */}
          <div className="bg-gradient-to-r from-brown-600 to-amber-700 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Bienvenue
            </h2>
            <p className="text-amber-100 text-sm">
              Accédez à votre espace de travail
            </p>
          </div>

          {/* Formulaire */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Champ Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-brown-700">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Mail className="h-5 w-5 text-brown-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-brown-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-brown-700">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className="h-5 w-5 text-brown-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 border border-brown-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brown-400 hover:text-brown-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 animate-pulse">
                  <p className="text-red-600 text-sm text-center font-medium">{error}</p>
                </div>
              )}

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-brown-600 to-amber-700 hover:from-brown-700 hover:to-amber-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Connexion...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    <span>Se connecter</span>
                  </>
                )}
              </button>

              {/* Lien mot de passe oublié */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="text-sm text-brown-600 hover:text-brown-800 font-medium hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </form>
          </div>

          
          </div>
        </div>

       
      </div>
   
  );
}