import { useState } from 'react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Loader2, ShieldCheck } from 'lucide-react';
import { resetPasswordRequestApi } from '../../services/api';
export default function ResetPasswordRequest() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const result = await resetPasswordRequestApi(email);
    setLoading(false);

    if (result.success) {
      setMessage(result.message || 'Un code a été envoyé à votre email.');
      setTimeout(() => {
        navigate('/reset-password-confirm', { state: { email } });
      }, 1000);
    } else {
      setError(result.error || "Erreur lors de l'envoi du code.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-beige-50 to-brown-50 p-4">
      {/* Elements decoratifs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-brown-400/20 to-amber-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-400/20 to-brown-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Carte principale */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header avec  un gradient */}
          <div className="bg-gradient-to-r from-brown-600 to-amber-700 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Mot de passe oublié ?
            </h2>
            <p className="text-amber-100 text-sm">
              Nous allons vous envoyer un code de réinitialisation
            </p>
          </div>

          {/* Formulaire */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Instructions */}
              <div className="bg-brown-50/50 rounded-xl p-4 border border-brown-200/30">
                <p className="text-sm text-brown-700 text-center">
                  💡 Saisissez votre adresse email pour recevoir un code de réinitialisation sécurisé
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

              {/* Messages d'erreur et de succes */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 animate-pulse">
                  <p className="text-red-600 text-sm text-center font-medium">{error}</p>
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 animate-pulse">
                  <p className="text-green-600 text-sm text-center font-medium">{message}</p>
                </div>
              )}

              {/* Bouton d'envoi */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brown-600 to-amber-700 hover:from-brown-700 hover:to-amber-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Envoyer le code</span>
                  </>
                )}
              </button>

              {/* Bouton retour */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center space-x-2 text-sm text-brown-600 hover:text-brown-800 font-medium hover:underline transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Retour à la connexion</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section informative */}
          <div className="bg-brown-50/50 backdrop-blur-sm border-t border-brown-200/50 p-6">
            <div className="text-center">
              <h3 className="text-sm font-semibold text-brown-700 mb-3">
                🔐 Sécurité et confidentialité
              </h3>
              <div className="space-y-2 text-xs text-brown-600">
                <p>• Le code est valide pendant 15 minutes</p>
                <p>• Vérifiez votre dossier spam si nécessaire</p>
                <p>• Aucune donnée personnelle n'est stockée</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-brown-500">
            Besoin d'aide ? Contactez l'administrateur système
          </p>
        </div>
      </div>
    </div>
  );
}