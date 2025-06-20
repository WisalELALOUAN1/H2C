import React, { useState } from 'react';
import { User, Shield, Save, Lock, Mail, UserCheck, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  
  // États pour la modification du profil
  const [profile, setProfile] = useState({
    prenom: user?.prenom || "",
    nom: user?.nom || "",
    email: user?.email || ""
  });
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  
  // États pour la modification du mot de passe
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Validation de la force du mot de passe
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: 'weak', color: 'red', text: 'Trop court' };
    if (password.length < 8) return { strength: 'medium', color: 'yellow', text: 'Moyen' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return { strength: 'medium', color: 'yellow', text: 'Moyen' };
    return { strength: 'strong', color: 'green', text: 'Fort' };
  };

  // Modification du profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(''); 
    setProfileError('');
    setProfileLoading(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:8000/auth/user/update/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.error || Object.values(data)[0] || "Erreur lors de la mise à jour.";
        throw new Error(errMsg);
      }
      setProfileSuccess(data.message || "Profil mis à jour avec succès !");
      setTimeout(() => setProfileSuccess(''), 5000);
    } catch (err: any) {
      setProfileError(err.message || "Erreur inattendue.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Modification du mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(''); 
    setPasswordError('');
    
    if (passwords.new !== passwords.confirm) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    
    if (passwords.new.length < 6) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:8000/auth/user/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          old_password: passwords.old,
          new_password: passwords.new
        })
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.error || Object.values(data)[0] || "Erreur lors du changement de mot de passe.";
        throw new Error(errMsg);
      }
      setPasswordSuccess(data.message || "Mot de passe mis à jour avec succès !");
      setPasswords({ old: '', new: '', confirm: '' });
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err: any) {
      setPasswordError(err.message || "Erreur inattendue.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const passwordStrength = getPasswordStrength(passwords.new);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brown-600 via-brown-700 to-brown-800 rounded-2xl shadow-xl">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-white opacity-5 rounded-full"></div>
          
          <div className="relative p-8 md:p-10">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Paramètres du compte</h1>
                <p className="text-brown-100 mt-2 text-lg">
                  Gérez vos informations personnelles et votre sécurité
                </p>
              </div>
            </div>
            
            {/* User info badge */}
            <div className="mt-6 inline-flex items-center space-x-2 bg-white bg-opacity-10 rounded-full px-4 py-2">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-white font-medium">
                {user?.prenom} {user?.nom}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h3>
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === 'profile'
                        ? 'bg-brown-100 text-brown-900 shadow-sm border border-brown-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">Profil</span>
                    {activeTab === 'profile' && (
                      <div className="ml-auto w-2 h-2 bg-brown-600 rounded-full"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === 'security'
                        ? 'bg-brown-100 text-brown-900 shadow-sm border border-brown-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Sécurité</span>
                    {activeTab === 'security' && (
                      <div className="ml-auto w-2 h-2 bg-brown-600 rounded-full"></div>
                    )}
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              {activeTab === 'profile' && (
                <div className="p-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="p-2 bg-brown-100 rounded-lg">
                      <User className="h-6 w-6 text-brown-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Informations personnelles</h3>
                      <p className="text-gray-600">Modifiez vos informations de profil</p>
                    </div>
                  </div>

                  {/* Messages d'état */}
                  {profileError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                      <span className="text-red-700">{profileError}</span>
                    </div>
                  )}
                  
                  {profileSuccess && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-green-700">{profileSuccess}</span>
                    </div>
                  )}

                  <form className="space-y-6" onSubmit={handleProfileSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Prénom
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={profile.prenom}
                            onChange={e => setProfile({ ...profile, prenom: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                            placeholder="Votre prénom"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nom de famille
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={profile.nom}
                            onChange={e => setProfile({ ...profile, nom: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                            placeholder="Votre nom"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Adresse email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={profile.email}
                          onChange={e => setProfile({ ...profile, email: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                          placeholder="votre@email.com"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t">
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="inline-flex items-center px-8 py-3 bg-brown-600 text-white rounded-xl hover:bg-brown-700 focus:ring-2 focus:ring-brown-500 focus:ring-offset-2 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {profileLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sauvegarde...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5 mr-2" />
                            Sauvegarder les modifications
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="p-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Shield className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Sécurité du compte</h3>
                      <p className="text-gray-600">Modifiez votre mot de passe pour sécuriser votre compte</p>
                    </div>
                  </div>

                  {/* Messages d'état */}
                  {passwordError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                      <span className="text-red-700">{passwordError}</span>
                    </div>
                  )}
                  
                  {passwordSuccess && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-green-700">{passwordSuccess}</span>
                    </div>
                  )}

                  <form className="space-y-6" onSubmit={handlePasswordSubmit}>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mot de passe actuel
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPasswords.old ? "text" : "password"}
                          value={passwords.old}
                          onChange={e => setPasswords({ ...passwords, old: e.target.value })}
                          className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                          placeholder="Votre mot de passe actuel"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('old')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.old ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwords.new}
                          onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                          className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                          placeholder="Votre nouveau mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      
                      {/* Indicateur de force du mot de passe */}
                      {passwords.new && (
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  passwordStrength.color === 'red' ? 'bg-red-500 w-1/3' :
                                  passwordStrength.color === 'yellow' ? 'bg-yellow-500 w-2/3' :
                                  'bg-green-500 w-full'
                                }`}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${
                              passwordStrength.color === 'red' ? 'text-red-600' :
                              passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {passwordStrength.text}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirmer le nouveau mot de passe
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwords.confirm}
                          onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                          className={`w-full pl-11 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200 ${
                            passwords.confirm && passwords.new !== passwords.confirm 
                              ? 'border-red-300' 
                              : 'border-gray-300'
                          }`}
                          placeholder="Confirmez votre nouveau mot de passe"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      
                      {passwords.confirm && passwords.new !== passwords.confirm && (
                        <p className="mt-2 text-sm text-red-600">Les mots de passe ne correspondent pas</p>
                      )}
                    </div>

                    <div className="flex justify-end pt-6 border-t">
                      <button
                        type="submit"
                        disabled={passwordLoading || !passwords.old || !passwords.new || !passwords.confirm}
                        className="inline-flex items-center px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {passwordLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Mise à jour...
                          </>
                        ) : (
                          <>
                            <Shield className="w-5 h-5 mr-2" />
                            Mettre à jour le mot de passe
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;