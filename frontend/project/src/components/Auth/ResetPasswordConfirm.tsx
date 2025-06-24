import  { useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Key, Lock, Eye, EyeOff, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { resetPasswordConfirmApi } from '../../services/api'; 
export default function ResetPasswordConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const emailInit = location.state?.email || '';
  const [email, setEmail] = useState(emailInit);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const result = await resetPasswordConfirmApi(email, resetToken, newPassword);
    setLoading(false);

    if (result.success) {
      setMessage(result.message || 'Mot de passe réinitialisé !');
      setTimeout(() => navigate('/login'), 1200);
    } else {
      setError(result.error || 'Erreur lors de la réinitialisation.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-beige-50 to-brown-50 p-4">
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-brown-400/20 to-amber-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-400/20 to-brown-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Carte principale  */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header =*/}
          <div className="bg-gradient-to-r from-brown-600 to-amber-700 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Key className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Nouveau mot de passe
            </h2>
            <p className="text-amber-100 text-sm">
              Créez un mot de passe sécurisé pour votre compte
            </p>
          </div>

          {/* Formulaire */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Instructions */}
              <div className="bg-brown-50/50 rounded-xl p-4 border border-brown-200/30">
                <p className="text-sm text-brown-700 text-center">
                  🔑 Vérifiez votre email pour récupérer le code de réinitialisation
                </p>
              </div>

              {/* Champ pour l'email */}
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
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-brown-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              {/* Champ du  code de reinitialisation */}
              <div className="space-y-2">
                <label htmlFor="resetToken" className="block text-sm font-semibold text-brown-700">
                  Code de réinitialisation
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Key className="h-5 w-5 text-brown-400" />
                  </div>
                  <input
                    id="resetToken"
                    type="text"
                    value={resetToken}
                    onChange={e => setResetToken(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-brown-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80 font-mono text-center tracking-wider"
                    placeholder="Code reçu par email"
                    required
                  />
                </div>
              </div>

              {/* Champ pour la saisi du  nouveau mot de passe */}
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-semibold text-brown-700">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className="h-5 w-5 text-brown-400" />
                  </div>
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 border border-brown-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm hover:bg-white/80"
                    placeholder="Nouveau mot de passe sécurisé"
                    required
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
                {/* Indicateur de force du mot de passe */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex space-x-1">
                      <div className={`h-1 w-1/4 rounded ${newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div className={`h-1 w-1/4 rounded ${newPassword.length >= 8 && /[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div className={`h-1 w-1/4 rounded ${newPassword.length >= 8 && /[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div className={`h-1 w-1/4 rounded ${newPassword.length >= 8 && /[!@#$%^&*]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                    <p className="text-xs text-brown-600 mt-1">
                      Force du mot de passe : {newPassword.length >= 8 ? 'Fort' : 'Faible'}
                    </p>
                  </div>
                )}
              </div>

              {/* Messages d'erreur et de succes */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 animate-pulse">
                  <p className="text-red-600 text-sm text-center font-medium">{error}</p>
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 animate-pulse">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-600 text-sm font-medium">{message}</p>
                  </div>
                </div>
              )}

              {/* Bouton de reinitialisation */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brown-600 to-amber-700 hover:from-brown-700 hover:to-amber-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Réinitialisation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Réinitialiser le mot de passe</span>
                  </>
                )}
              </button>

              {/* Bouton retour */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="inline-flex items-center space-x-2 text-sm text-brown-600 hover:text-brown-800 font-medium hover:underline transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Renvoyer un code</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section conseils sécurité */}
          <div className="bg-brown-50/50 backdrop-blur-sm border-t border-brown-200/50 p-6">
            <div className="text-center">
              <h3 className="text-sm font-semibold text-brown-700 mb-3">
                🔒 Conseils pour un mot de passe sécurisé
              </h3>
              <div className="space-y-1 text-xs text-brown-600">
                <p>• Au moins 8 caractères</p>
                <p>• Mélange de majuscules et minuscules</p>
                <p>• Inclure des chiffres et symboles</p>
                <p>• Éviter les informations personnelles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-brown-500">
            Une fois connecté, vous pourrez modifier votre mot de passe à nouveau
          </p>
        </div>
      </div>
    </div>
  );
}