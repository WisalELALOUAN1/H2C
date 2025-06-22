"use client"

import * as React from 'react';
import { useEffect, useState } from "react"
import { CheckCircle, XCircle, Calendar, User, MessageSquare, Clock, AlertCircle } from "lucide-react"
import { fetchPendingRequestsApi, validateLeaveRequestApi } from "../../services/api"

type Demande = {
  id: number
  user: string
  user_id: number
  type_demande: string
  date_debut: string
  date_fin: string
  status: string
  commentaire: string
  demi_jour: boolean
  date_soumission: string
}

const ManagerPendingRequests: React.FC = () => {
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPendingRequests()
  }, [])

  const fetchPendingRequests = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchPendingRequestsApi()
      setDemandes(data)
    } catch (error: any) {
      console.error("Erreur lors de la récupération des demandes:", error)
      setError(error.message || "Erreur lors du chargement des demandes")
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    const notification = document.createElement("div")
    const bgColor =
      type === "success"
        ? "bg-emerald-100 border-emerald-400 text-emerald-800"
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

  const handleStatusChange = async (demandeId: number, newStatus: "validé" | "refusé") => {
    setProcessingId(demandeId)
    try {
      await validateLeaveRequestApi(demandeId, newStatus)

      // Retirer la demande de la liste après validation
      setDemandes((prev) => prev.filter((d) => d.id !== demandeId))

      // Notification de succès
      const statusText = newStatus === "validé" ? "approuvée" : "refusée"
      showNotification(`Demande ${statusText} avec succès`, "success")
    } catch (error: any) {
      console.error("Erreur lors de la modification du statut:", error)
      showNotification(error.message || "Une erreur est survenue lors de la modification", "error")
    } finally {
      setProcessingId(null)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "payé":
      case "congé payé":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "spécial":
      case "congé maladie":
        return "bg-rose-100 text-rose-800 border-rose-200"
      case "sans_solde":
      case "rtt":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-amber-100 text-amber-800 border-amber-200"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case "payé":
        return "Congé payé"
      case "spécial":
        return "Congé spécial"
      case "sans_solde":
        return "Sans solde"
      default:
        return type
    }
  }

  const calculateDuration = (dateDebut: string, dateFin: string, demiJour: boolean) => {
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    const diffTime = Math.abs(fin.getTime() - debut.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (demiJour && diffDays === 1) {
      return "0.5 jour"
    }
    return `${diffDays} jour${diffDays > 1 ? "s" : ""}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-8">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700"></div>
              <span className="text-amber-800 font-medium">Chargement des demandes...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-amber-200 rounded-lg">
              <Clock className="w-6 h-6 text-amber-800" />
            </div>
            <h1 className="text-3xl font-bold text-amber-900">Demandes de congé en attente</h1>
          </div>
          <p className="text-amber-700">Gérez les demandes de congé de votre équipe</p>

          {/* Stats */}
          <div className="mt-6 flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-amber-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                {demandes.length} demande{demandes.length > 1 ? "s" : ""} en attente
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
            <button
              onClick={fetchPendingRequests}
              className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm font-medium transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-amber-200 overflow-hidden">
          {demandes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-4 bg-amber-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-amber-900 mb-2">Aucune demande en attente</h3>
              <p className="text-amber-600">Toutes les demandes ont été traitées.</p>
              
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
                  <tr>
                    <th className="p-4 text-left text-amber-900 font-semibold">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Employé</span>
                      </div>
                    </th>
                    <th className="p-4 text-left text-amber-900 font-semibold">Type</th>
                    <th className="p-4 text-left text-amber-900 font-semibold">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Période</span>
                      </div>
                    </th>
                    <th className="p-4 text-left text-amber-900 font-semibold">Durée</th>
                    <th className="p-4 text-left text-amber-900 font-semibold">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Commentaire</span>
                      </div>
                    </th>
                    <th className="p-4 text-left text-amber-900 font-semibold">Soumis le</th>
                    <th className="p-4 text-center text-amber-900 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((demande, index) => (
                    <tr
                      key={demande.id}
                      className={`border-b border-amber-100 hover:bg-amber-25 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-amber-25"
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center">
                            <span className="text-amber-800 font-semibold text-sm">
                              {demande.user
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-amber-900">{demande.user}</div>
                            <div className="text-xs text-amber-600">ID: {demande.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(
                            demande.type_demande,
                          )}`}
                        >
                          {getTypeLabel(demande.type_demande)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-amber-900">
                          <div className="font-medium">{formatDate(demande.date_debut)}</div>
                          <div className="text-sm text-amber-600">au {formatDate(demande.date_fin)}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-amber-900 font-medium">
                            {calculateDuration(demande.date_debut, demande.date_fin, demande.demi_jour)}
                          </span>
                          {demande.demi_jour && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              1/2 jour
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="text-amber-900 text-sm">
                          {demande.commentaire ? (
                            <div className="truncate" title={demande.commentaire}>
                              {demande.commentaire}
                            </div>
                          ) : (
                            <span className="text-amber-500 italic">Aucun commentaire</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-amber-900 text-sm">{formatDate(demande.date_soumission)}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleStatusChange(demande.id, "validé")}
                            disabled={processingId === demande.id}
                            className="flex items-center space-x-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
                            title="Approuver la demande"
                          >
                            {processingId === demande.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">Valider</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(demande.id, "refusé")}
                            disabled={processingId === demande.id}
                            className="flex items-center space-x-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
                            title="Refuser la demande"
                          >
                            {processingId === demande.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">Refuser</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        {demandes.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={fetchPendingRequests}
              disabled={loading}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
            >
              {loading ? "Actualisation..." : "Actualiser la liste"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManagerPendingRequests
