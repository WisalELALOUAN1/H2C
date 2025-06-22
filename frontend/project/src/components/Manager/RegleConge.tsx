"use client"
import * as React from 'react';
import { useState, useEffect } from "react"
import {
  Settings,
  Edit,
  BookOpen,
  Users,
  Calendar,
  Calculator,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { fetchTeamRulesApi, saveTeamRulesApi, fetchFormulasApi, fetchManagerTeamsApi } from "../../services/api"

interface Formule {
  id: number
  nom_formule: string
  expressions: Record<string, string>
}

interface RegleConge {
  id?: number
  equipe: number
  formule_defaut: Formule | number
  jours_ouvrables_annuels: number
  jours_acquis_annuels: number
  jours_conges_acquis?: number
  jours_travailles: number
  nb_feries: number
  nbr_max_negatif: number
  date_mise_a_jour: string
}

interface Equipe {
  id: number
  nom: string
}

const TeamRulesConfig: React.FC = () => {
  const { user } = useAuth()
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [selectedEquipe, setSelectedEquipe] = useState<number | null>(null)
  const [regleEquipe, setRegleEquipe] = useState<RegleConge | null>(null)
  const [formules, setFormules] = useState<Formule[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    formule_defaut: "",
    jours_acquis_annuels: 25,
    jours_travailles: 230,
    nb_feries: 10,
    nbr_max_negatif: 0
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (user?.role !== "manager" && user?.role !== "admin") {
      setError("Cette fonctionnalité est réservée aux managers et administrateurs.")
      return
    }

    if (user?.role === "manager") {
      fetchData()
    }
  }, [user])

  useEffect(() => {
    if (selectedEquipe) {
      fetchRegleEquipe()
    }
  }, [selectedEquipe])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      const [equipesData, formulesData] = await Promise.all([
        fetchManagerTeamsApi(),
        fetchFormulasApi()
      ])

      setEquipes(equipesData)
      setFormules(formulesData)

      if (equipesData.length > 0) {
        setSelectedEquipe(equipesData[0].id)
      } else {
        setError("Aucune équipe trouvée. Vous devez être assigné à au moins une équipe pour utiliser cette fonctionnalité.")
      }
    } catch (err: any) {
      console.error("Erreur détaillée:", err)
      setError(err.message || "Erreur lors du chargement des données")
    } finally {
      setLoading(false)
    }
  }

  const fetchRegleEquipe = async () => {
    if (!selectedEquipe) return

    setLoading(true)
    try {
      const data = await fetchTeamRulesApi(selectedEquipe)
      if (data) {
        setRegleEquipe(data)
        setFormData({
          formule_defaut: typeof data.formule_defaut === "object" ? data.formule_defaut.id : data.formule_defaut,
          jours_acquis_annuels: data.jours_acquis_annuels,
          jours_travailles: data.jours_travailles || 230,
          nb_feries: data.nb_feries || 10,
          nbr_max_negatif: data.nbr_max_negatif ?? 0
        })
      } else {
        setRegleEquipe(null)
        setFormData({
          formule_defaut: "",
          jours_acquis_annuels: 25,
          jours_travailles: 230,
          nb_feries: 10,
          nbr_max_negatif: 0
        })
      }
    } catch (err: any) {
      console.error("Erreur lors du chargement des règles:", err)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}

    if (!formData.formule_defaut) {
      errors.formule_defaut = "Veuillez sélectionner une formule"
    }
    if (formData.jours_acquis_annuels < 1 || formData.jours_acquis_annuels > 365) {
      errors.jours_acquis_annuels = "Les jours acquis doivent être entre 1 et 365"
    }
    if (formData.jours_travailles < 1 || formData.jours_travailles > 365) {
      errors.jours_travailles = "Les jours travaillés doivent être entre 1 et 365"
    }
    if (formData.nb_feries < 0 || formData.nb_feries > 50) {
      errors.nb_feries = "Le nombre de jours fériés doit être entre 0 et 50"
    }
    if (formData.nbr_max_negatif < 0 || formData.nbr_max_negatif > 30) {
      errors.nbr_max_negatif = "Le nombre maximal de jours négatifs doit être entre 0 et 30"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm() || !selectedEquipe) return

    setLoading(true)
    try {
      const payload = {
        equipe: selectedEquipe,
        formule_defaut: Number(formData.formule_defaut),
        jours_acquis_annuels: formData.jours_acquis_annuels,
        jours_travailles: formData.jours_travailles,
        nb_feries: formData.nb_feries,
        nbr_max_negatif: formData.nbr_max_negatif
      }

      await saveTeamRulesApi(selectedEquipe, payload, !!regleEquipe)
      setIsModalVisible(false)
      await fetchRegleEquipe()
      showNotification("Règles sauvegardées avec succès", "success")
    } catch (err: any) {
      showNotification(err.message || "Erreur lors de la sauvegarde", "error")
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message: string, type: "success" | "error") => {
    const notification = document.createElement("div")
    const bgColor = type === "success" 
      ? "bg-green-100 border-green-400 text-green-800" 
      : "bg-red-100 border-red-400 text-red-800"

    notification.className = `fixed top-4 right-4 ${bgColor} px-4 py-3 rounded-lg shadow-lg z-50 border`
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
        </svg>
        <span>${message}</span>
      </div>
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 4000)
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const getSelectedFormule = () => {
    return formules.find(f => f.id === Number(formData.formule_defaut))
  }
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-brown-50 to-amber-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-brown-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-brown-600 rounded-xl">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-brown-900">Configuration des règles de congé</h1>
                <p className="text-brown-600 mt-1">Gérez les paramètres de calcul des congés pour vos équipes</p>
              </div>
            </div>
            <button
              onClick={() => setIsModalVisible(true)}
              disabled={!selectedEquipe || loading}
              className="flex items-center space-x-2 px-6 py-3 bg-brown-600 text-white rounded-xl hover:bg-brown-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              <Edit className="w-5 h-5" />
              <span className="font-semibold">Modifier les règles</span>
            </button>
          </div>

          {/* Team Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-brown-800 mb-3">Sélectionner une équipe</label>
            <div className="relative max-w-md">
              <select
                value={selectedEquipe || ""}
                onChange={(e) => setSelectedEquipe(Number(e.target.value))}
                className="w-full px-4 py-3 border border-brown-200 rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 bg-white appearance-none pr-10"
              >
                <option value="">Choisissez une équipe à configurer</option>
                {equipes.map(equipe => (
                  <option key={equipe.id} value={equipe.id}>
                    {equipe.nom}
                  </option>
                ))}
              </select>
              <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brown-400 pointer-events-none" />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Erreur d'accès</h4>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Rules Display */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600"></div>
              <span className="ml-3 text-brown-600 font-medium">Chargement...</span>
            </div>
          ) : regleEquipe ? (
            <div className="bg-brown-50 rounded-xl p-6 border border-brown-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg p-4 border border-brown-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calculator className="w-5 h-5 text-brown-600" />
                    <span className="font-semibold text-brown-800">Formule</span>
                  </div>
                  <p className="text-brown-900 font-medium">
                    {typeof regleEquipe.formule_defaut === "object" ? regleEquipe.formule_defaut?.nom_formule : "—"}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-brown-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-5 h-5 text-brown-600" />
                    <span className="font-semibold text-brown-800">Jours ouvrables</span>
                  </div>
                  <p className="text-2xl font-bold text-brown-900">{regleEquipe.jours_ouvrables_annuels}</p>
                  <p className="text-sm text-brown-600">jours/an</p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-brown-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <AlertCircle className="w-5 h-5 text-brown-600" />
                    <span className="font-semibold text-brown-800">Jours négatifs max</span>
                  </div>
                  <p className="text-2xl font-bold text-brown-900">{regleEquipe.nbr_max_negatif}</p>
                  <p className="text-sm text-brown-600">jours</p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-brown-200">
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-brown-600" />
                    <span className="font-semibold text-brown-800">Jours acquis</span>
                  </div>
                  <p className="text-2xl font-bold text-brown-900">{regleEquipe.jours_acquis_annuels}</p>
                  <p className="text-sm text-brown-600">jours/an</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-brown-200">
                <p className="text-sm text-brown-600">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Dernière mise à jour : {formatDate(regleEquipe.date_mise_a_jour)}
                </p>
              </div>
            </div>
          ) : selectedEquipe ? (
            <div className="text-center py-12 bg-brown-50 rounded-xl border-2 border-dashed border-brown-300">
              <Settings className="w-16 h-16 text-brown-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-brown-800 mb-2">Aucune règle définie</h3>
              <p className="text-brown-600">Cliquez sur "Modifier les règles" pour commencer la configuration</p>
            </div>
          ) : null}
        </div>

        {/* Available Formulas */}
        <div className="bg-white rounded-2xl shadow-lg border border-brown-200 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-brown-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-brown-600" />
            </div>
            <h2 className="text-2xl font-bold text-brown-900">Formules disponibles</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formules.map(formule => (
              <div
                key={formule.id}
                className="bg-brown-50 rounded-lg p-6 border border-brown-200 hover:border-brown-400 transition-colors duration-200"
              >
                <h3 className="font-semibold text-brown-800 mb-3">{formule.nom_formule}</h3>
                <div className="bg-white rounded-md p-3 border border-brown-200">
                  <div className="space-y-1">
                    {Object.entries(formule.expressions).map(([cle, valeur]) => (
                      <div key={cle} className="mb-1">
                        <span className="font-medium text-brown-800">{cle}</span>:{" "}
                        <code className="text-sm text-brown-700 font-mono">{valeur}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-brown-600 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Edit className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Modifier les règles de congé</h3>
                </div>
                <button
                  onClick={() => setIsModalVisible(false)}
                  className="p-2 hover:bg-brown-700 rounded-full transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              {/* Formule Selection */}
              <div>
                <label className="block text-sm font-semibold text-brown-800 mb-2">Formule de calcul *</label>
                <select
                  value={formData.formule_defaut}
                  onChange={(e) => handleFormChange("formule_defaut", e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 ${
                    formErrors.formule_defaut ? "border-red-300" : "border-brown-200"
                  }`}
                >
                  <option value="">Sélectionner une formule</option>
                  {formules.map(formule => (
                    <option key={formule.id} value={formule.id}>
                      {formule.nom_formule}
                    </option>
                  ))}
                </select>
                {formErrors.formule_defaut && <p className="text-red-500 text-sm mt-1">{formErrors.formule_defaut}</p>}
                {getSelectedFormule() && (
                  <div className="mt-2 p-3 bg-brown-50 rounded-lg border border-brown-200">
                    {getSelectedFormule()?.expressions &&
                      Object.entries(getSelectedFormule()!.expressions).map(([nom, expr]) => (
                        <div key={nom}>
                          <span className="font-semibold text-brown-800">{nom}</span>:{" "}
                          <code className="text-sm text-brown-700">{expr}</code>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">Jours acquis annuellement *</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.jours_acquis_annuels}
                    onChange={(e) => handleFormChange("jours_acquis_annuels", Number(e.target.value))}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 ${
                      formErrors.jours_acquis_annuels ? "border-red-300" : "border-brown-200"
                    }`}
                    placeholder="Ex: 25"
                  />
                  {formErrors.jours_acquis_annuels && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.jours_acquis_annuels}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">Jours travaillés *</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.jours_travailles}
                    onChange={(e) => handleFormChange("jours_travailles", Number(e.target.value))}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 ${
                      formErrors.jours_travailles ? "border-red-300" : "border-brown-200"
                    }`}
                    placeholder="Ex: 230"
                  />
                  {formErrors.jours_travailles && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.jours_travailles}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">Jours fériés</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.nb_feries}
                    onChange={(e) => handleFormChange("nb_feries", Number(e.target.value))}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 ${
                      formErrors.nb_feries ? "border-red-300" : "border-brown-200"
                    }`}
                    placeholder="Ex: 10"
                  />
                  {formErrors.nb_feries && <p className="text-red-500 text-sm mt-1">{formErrors.nb_feries}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">
                    Jours négatifs maximum autorisés
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={formData.nbr_max_negatif}
                    onChange={(e) => handleFormChange("nbr_max_negatif", Number(e.target.value))}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brown-500 focus:border-brown-500 ${
                      formErrors.nbr_max_negatif ? "border-red-300" : "border-brown-200"
                    }`}
                    placeholder="Ex: 10"
                  />
                  {formErrors.nbr_max_negatif && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.nbr_max_negatif}</p>
                  )}
                  <p className="text-xs text-brown-500 mt-1">
                    Nombre maximum de jours de congé pouvant être négatifs (0 pour désactiver)
                  </p>
                </div>
              </div>

              {/* Current Values Display */}
              {regleEquipe && (
                <div className="bg-brown-50 rounded-xl p-4 border border-brown-200">
                  <h4 className="font-semibold text-brown-800 mb-3">Valeurs actuelles calculées</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-brown-600">Jours ouvrables annuels:</span>
                      <span className="ml-2 font-semibold text-brown-900">{regleEquipe.jours_ouvrables_annuels}</span>
                    </div>
                    <div>
                      <span className="text-brown-600">Jours négatifs max:</span>
                      <span className="ml-2 font-semibold text-brown-900">{regleEquipe.nbr_max_negatif}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 px-8 py-6 border-t border-brown-200">
              <button
                onClick={() => setIsModalVisible(false)}
                className="px-6 py-3 border border-brown-300 text-brown-700 rounded-xl hover:bg-brown-50 transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-3 bg-brown-600 text-white rounded-xl hover:bg-brown-700 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>{loading ? "Sauvegarde..." : "Sauvegarder"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamRulesConfig