"use client"

import * as React from 'react';
import { useState, useEffect } from "react"
import {
  User,
  Shield,
  Save,
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  TestTube,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { updateUserProfileApi, changePasswordApi, testAuthenticationApi } from "../../services/api"

const SettingsView: React.FC = () => {
  const { user, refreshUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile")
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  })

  // États pour la modification du profil
  const [profile, setProfile] = useState({
    prenom: user?.prenom || "",
    nom: user?.nom || "",
    email: user?.email || "",
  })
  const [profileSuccess, setProfileSuccess] = useState("")
  const [profileError, setProfileError] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)

  // États pour la modification du mot de passe
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" })
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)

  // États pour le test d'authentification
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  // Synchroniser les champs du formulaire avec les données utilisateur
  useEffect(() => {
    if (user) {
      setProfile({
        prenom: user.prenom || "",
        nom: user.nom || "",
        email: user.email || "",
      })
    }
  }, [user])

  // Test d'authentification
  const handleTestAuth = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const result = await testAuthenticationApi()
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: error instanceof Error ? error.message : String(error) })
    } finally {
      setTestLoading(false)
    }
  }

  // Validation de la force du mot de passe
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: "weak", color: "red", text: "Trop court" }
    if (password.length < 8) return { strength: "medium", color: "yellow", text: "Moyen" }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return { strength: "medium", color: "yellow", text: "Moyen" }
    return { strength: "strong", color: "green", text: "Fort" }
  }

  // Vérifier la validité du token
  const checkTokenValidity = () => {
    const token = localStorage.getItem("accessToken")
    if (!token) {
      setPasswordError("Session expirée. Veuillez vous reconnecter.")
      return false
    }
    return true
  }

  // Modification du profil
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSuccess("")
    setProfileError("")
    setProfileLoading(true)

    try {
      // Mettre à jour le profil via l'API
      const updatedData = await updateUserProfileApi(profile)
      console.log("Profil mis à jour avec succès:", updatedData)

      // Mettre à jour le localStorage avec les nouvelles données
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}")
      const updatedUser = {
        ...currentUser,
        prenom: profile.prenom,
        nom: profile.nom,
        email: profile.email,
      }
      localStorage.setItem("currentUser", JSON.stringify(updatedUser))

      // Rafraîchir les données utilisateur dans le contexte
      try {
        await refreshUser()
        console.log("Données utilisateur rafraîchies avec succès")
      } catch (refreshError) {
        console.warn("Impossible de rafraîchir les données utilisateur:", refreshError)
        // Même si le refresh échoue, on peut continuer car la mise à jour a réussi
      }

      setProfileSuccess("Profil mis à jour avec succès !")
      setTimeout(() => setProfileSuccess(""), 5000)
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour du profil:", err)
      setProfileError(err.message || "Erreur lors de la mise à jour du profil")
    } finally {
      setProfileLoading(false)
    }
  }

  // Modification du mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccess("")
    setPasswordError("")

    // Vérifications préliminaires
    if (!checkTokenValidity()) {
      return
    }

    if (passwords.new !== passwords.confirm) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.")
      return
    }

    if (passwords.new.length < 6) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères.")
      return
    }

    if (passwords.old.length < 1) {
      setPasswordError("Veuillez saisir votre mot de passe actuel.")
      return
    }

    setPasswordLoading(true)

    try {
      await changePasswordApi(passwords.old, passwords.new)
      setPasswordSuccess("Mot de passe mis à jour avec succès !")
      setPasswords({ old: "", new: "", confirm: "" })
      setTimeout(() => setPasswordSuccess(""), 5000)
    } catch (err: any) {
      console.error("Erreur lors du changement de mot de passe:", err)

      // Gestion spécifique des erreurs d'authentification
      if (err.message.includes("Session expirée") || err.message.includes("reconnecter")) {
        setPasswordError("Votre session a expiré. Vous allez être redirigé vers la page de connexion.")
        setTimeout(() => {
          logout()
          window.location.href = "/login"
        }, 2000)
      } else {
        setPasswordError(err.message || "Erreur lors du changement de mot de passe")
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  const togglePasswordVisibility = (field: "old" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const passwordStrength = getPasswordStrength(passwords.new)

  return (
    <div className="min-h-screen bg-gradient-to-br from-brown-50 to-amber-50 p-4 md:p-6">
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
                <p className="text-brown-100 mt-2 text-lg">Gérez vos informations personnelles et votre sécurité</p>
              </div>
            </div>

            {/* User info badge - Affiche les données en temps réel */}
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
            <div className="bg-white rounded-2xl shadow-lg border border-brown-100 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-brown-900 mb-4">Navigation</h3>
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === "profile"
                        ? "bg-brown-100 text-brown-900 shadow-sm border border-brown-200"
                        : "text-brown-600 hover:bg-brown-50 hover:text-brown-900"
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span className="font-medium">Profil</span>
                    {activeTab === "profile" && <div className="ml-auto w-2 h-2 bg-brown-600 rounded-full"></div>}
                  </button>
                  <button
                    onClick={() => setActiveTab("security")}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === "security"
                        ? "bg-brown-100 text-brown-900 shadow-sm border border-brown-200"
                        : "text-brown-600 hover:bg-brown-50 hover:text-brown-900"
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Sécurité</span>
                    {activeTab === "security" && <div className="ml-auto w-2 h-2 bg-brown-600 rounded-full"></div>}
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg border border-brown-100">
              {activeTab === "profile" && (
                <div className="p-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="p-2 bg-brown-100 rounded-lg">
                      <User className="h-6 w-6 text-brown-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-brown-900">Informations personnelles</h3>
                      <p className="text-brown-600">Modifiez vos informations de profil</p>
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
                        <label className="block text-sm font-semibold text-brown-700 mb-2">Prénom</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={profile.prenom}
                            onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                            className="w-full px-4 py-3 border border-brown-200 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                            placeholder="Votre prénom"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-brown-700 mb-2">Nom de famille</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={profile.nom}
                            onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                            className="w-full px-4 py-3 border border-brown-200 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                            placeholder="Votre nom"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-brown-700 mb-2">Adresse email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brown-400" />
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 border border-brown-200 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                          placeholder="votre@email.com"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-brown-200">
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="inline-flex items-center px-8 py-3 bg-brown-600 text-white rounded-xl hover:bg-brown-700 focus:ring-2 focus:ring-brown-500 focus:ring-offset-2 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                      >
                        {profileLoading ? (
                          <>
                            <RefreshCw className="animate-spin -ml-1 mr-3 h-5 w-5" />
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

              {activeTab === "security" && (
                <div className="p-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Shield className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-brown-900">Sécurité du compte</h3>
                      <p className="text-brown-600">Modifiez votre mot de passe pour sécuriser votre compte</p>
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

                  {/* Vérification du token */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span className="text-blue-800 font-medium">
                        Session active : {localStorage.getItem("accessToken") ? "✓ Connecté" : "✗ Non connecté"}
                      </span>
                    </div>
                  </div>

                  <form className="space-y-6" onSubmit={handlePasswordSubmit}>
                    <div>
                      <label className="block text-sm font-semibold text-brown-700 mb-2">Mot de passe actuel *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brown-400" />
                        <input
                          type={showPasswords.old ? "text" : "password"}
                          value={passwords.old}
                          onChange={(e) => setPasswords({ ...passwords, old: e.target.value })}
                          className="w-full pl-11 pr-12 py-3 border border-brown-200 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                          placeholder="Votre mot de passe actuel"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("old")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brown-400 hover:text-brown-600"
                        >
                          {showPasswords.old ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-brown-700 mb-2">Nouveau mot de passe *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brown-400" />
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwords.new}
                          onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                          className="w-full pl-11 pr-12 py-3 border border-brown-200 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200"
                          placeholder="Votre nouveau mot de passe"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("new")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brown-400 hover:text-brown-600"
                        >
                          {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>

                      {/* Indicateur de force du mot de passe */}
                      {passwords.new && (
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-brown-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  passwordStrength.color === "red"
                                    ? "bg-red-500 w-1/3"
                                    : passwordStrength.color === "yellow"
                                      ? "bg-yellow-500 w-2/3"
                                      : "bg-green-500 w-full"
                                }`}
                              ></div>
                            </div>
                            <span
                              className={`text-sm font-medium ${
                                passwordStrength.color === "red"
                                  ? "text-red-600"
                                  : passwordStrength.color === "yellow"
                                    ? "text-yellow-600"
                                    : "text-green-600"
                              }`}
                            >
                              {passwordStrength.text}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-brown-700 mb-2">
                        Confirmer le nouveau mot de passe *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brown-400" />
                        <input type={showPasswords.confirm ? "text" : "password"} />
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                          className={`w-full pl-11 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 transition-colors duration-200 ${
                            passwords.confirm && passwords.new !== passwords.confirm
                              ? "border-red-300"
                              : "border-brown-200"
                          }`}
                          placeholder="Confirmez votre nouveau mot de passe"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("confirm")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brown-400 hover:text-brown-600"
                        >
                          {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>

                      {passwords.confirm && passwords.new !== passwords.confirm && (
                        <p className="mt-2 text-sm text-red-600">Les mots de passe ne correspondent pas</p>
                      )}
                    </div>

                    <div className="flex justify-end pt-6 border-t border-brown-200">
                      <button
                        type="submit"
                        disabled={
                          passwordLoading ||
                          !passwords.old ||
                          !passwords.new ||
                          !passwords.confirm ||
                          passwords.new !== passwords.confirm
                        }
                        className="inline-flex items-center px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                      >
                        {passwordLoading ? (
                          <>
                            <RefreshCw className="animate-spin -ml-1 mr-3 h-5 w-5" />
                            Mise à jour...
                          </>
                        ) : (
                          <>
                            <Shield className="w-5 w-5 mr-2" />
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
  )
}

export default SettingsView
