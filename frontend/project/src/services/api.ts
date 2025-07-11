import axios from "axios"
import type { GlobalRules, User, EquipeFormData,Formation, Equipe ,ManagerDashboardData,LightProject,WeekStatus,ImputationHoraire,ProjetFormData,UserFormData,LeaveRequest,EmployeeCurrentSolde,SoldeHistory,MonthlySummary,WeeklyImputation,ReportData,ReportParams,Projet,TimeEntryData} from "../types"

const API_BASE_URL = "http://localhost:8000" 
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})
api.interceptors.response.use(response => response, error => {
    if (error.response?.status === 401) {
        // Gestion plus robuste du refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken && window.location.pathname !== '/login') {
            return api.post('/auth/token/refresh/', { refresh: refreshToken })
                .then(response => {
                    localStorage.setItem('accessToken', response.data.access);
                    error.config.headers.Authorization = `Bearer ${response.data.access}`;
                    return api.request(error.config);
                })
                .catch(() => {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                });
        } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken")
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

// --- AUTH ---
export const loginApi = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login/", { email, password })
    const data = response.data

    if (response.status === 200 && data.access && data.user) {
      return { user: data.user, access: data.access, refresh: data.refresh }
    }

    if (data.first_login) {
      return { first_login: true, message: data.message, email }
    }

    // Gestion d'erreurs
    if (data.error) return data.error
    if (data.non_field_errors?.length) return data.non_field_errors[0]
    if (typeof data.detail === "string") return data.detail

    return "Erreur inconnue"
  } catch (error: any) {
    if (error.response?.data) {
      const err = error.response.data
      if (err.error) return err.error
      if (err.non_field_errors?.length) return err.non_field_errors[0]
      if (typeof err.detail === "string") return err.detail
    }
    return "Erreur technique, vérifiez la connexion."
  }
}

export const fetchUserProfileApi = async () => {
  const token = localStorage.getItem("accessToken")
  const response = await api.get("/auth/user/update/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

export async function resetPasswordConfirmApi(email: string, resetToken: string, newPassword: string) {
  try {
    const response = await fetch("http://localhost:8000/auth/password-reset-confirm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        reset_token: resetToken,
        new_password: newPassword,
      }),
    })

    const data = await response.json()
    if (response.ok) {
      return { success: true, message: "Mot de passe réinitialisé !" }
    } else {
      return { success: false, error: data?.error || "Erreur lors de la réinitialisation." }
    }
  } catch (error) {
    return { success: false, error: "Erreur réseau ou serveur." }
  }
}

export async function resetPasswordRequestApi(email: string) {
  try {
    const response = await fetch("http://localhost:8000/auth/password-reset/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const data = await response.json()
    if (response.ok) {
      return { success: true, message: data.message || "Code envoyé" }
    } else {
      return { success: false, error: data.error || "Erreur lors de l'envoi du code" }
    }
  } catch (err) {
    return { success: false, error: "Erreur réseau. Veuillez réessayer." }
  }
}

// --- GLOBAL RULES ---
export const fetchGlobalRulesApi = async (): Promise<GlobalRules> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/regles-globaux/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Échec du chargement des règles")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const saveGlobalRulesApi = async (rules: GlobalRules): Promise<GlobalRules> => {
  try {
    const method = rules.id ? "PUT" : "POST"

    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/regles-globaux/`, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(rules),
    })

    if (!response.ok) {
      throw new Error(response.statusText || "Échec de la sauvegarde")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Une erreur est survenue")
  }
}

// --- HOLIDAYS ---
export const fetchHolidaysApi = async (countryCode: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/holidays/?country=${countryCode}`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Échec de récupération des jours fériés")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

// --- TEAM MANAGEMENT ---
export const fetchManagersApi = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/managers/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Échec de récupération des managers")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const fetchEmployesApi = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/employes/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Échec de récupération des employés")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const createEquipeApi = async (equipeData: EquipeFormData): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(equipeData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Échec de création de l'équipe")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const fetchEquipesApi = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Échec de récupération des équipes")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const updateEquipeApi = async (equipeId: number, equipeData: EquipeFormData): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/${equipeId}/`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(equipeData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Échec de mise à jour de l'équipe")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const deleteEquipeApi = async (equipeId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/equipes/${equipeId}/`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Échec de suppression de l'équipe")
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const fetchTeamsApi = async (): Promise<Equipe[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/equipes/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Erreur lors du chargement des équipes")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const fetchUsersApi = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/users/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Erreur lors du chargement des utilisateurs")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const createTeamApi = async (teamData: EquipeFormData): Promise<Equipe> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/equipes/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(teamData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData?.error || "Erreur lors de la création de l'équipe")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const updateTeamApi = async (teamId: number, teamData: EquipeFormData): Promise<Equipe> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/equipes/${teamId}/`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(teamData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData?.error || "Erreur lors de la modification de l'équipe")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}
// --- USER MANAGEMENT ---
export const fetchUsersAdminApi = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/users/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des utilisateurs")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const createUserApi = async (userData: UserFormData): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        role: userData.role,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Gestion des erreurs de validation
      if (typeof data === "object" && data !== null) {
        const errorMessages: string[] = []
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(" ")}`)
          } else if (typeof messages === "string") {
            errorMessages.push(`${field}: ${messages}`)
          }
        })
        if (errorMessages.length > 0) {
          throw new Error(errorMessages.join(", "))
        }
      }

      throw new Error(data.error || data.message || "Erreur lors de la création de l'utilisateur")
    }

    return data
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const updateUserApi = async (userId: number, userData: Partial<UserFormData>): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/users/${userId}/`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        nom: userData.nom,
        prenom: userData.prenom,
        role: userData.role,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Gestion des erreurs de validation
      if (typeof data === "object" && data !== null) {
        const errorMessages: string[] = []
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(" ")}`)
          } else if (typeof messages === "string") {
            errorMessages.push(`${field}: ${messages}`)
          }
        })
        if (errorMessages.length > 0) {
          throw new Error(errorMessages.join(", "))
        }
      }

      throw new Error(data.error || data.message || "Erreur lors de la modification de l'utilisateur")
    }

    return data
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const toggleUserStatusApi = async (userId: number, isActive: boolean): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/users/${userId}/activate/`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erreur lors du changement de statut")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const changeUserRoleApi = async (userId: number, newRole: "admin" | "manager" | "employe"): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/users/${userId}/role/`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ role: newRole }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.error || "Erreur lors du changement de rôle")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const deleteUserApi = async (userId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/users/${userId}/`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erreur lors de la suppression de l'utilisateur")
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}
// --- LEAVE MANAGEMENT ---
export const fetchEmployeeDashboardApi = async (): Promise<{
  solde: number
  demandes: LeaveRequest[]
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/employe/dashboard/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Erreur lors du chargement du dashboard")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const deleteLeaveRequestApi = async (requestId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/demande-conge/${requestId}/`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Erreur lors de la suppression de la demande")
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const createLeaveRequestApi = async (requestData: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/demande-conge/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erreur lors de la création de la demande")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const updateLeaveRequestApi = async (requestId: number, requestData: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/demande-conge/${requestId}/`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erreur lors de la modification de la demande")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const fetchLeaveRequestApi = async (requestId: number): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/demande-conge/${requestId}/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération de la demande")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}
// --- MANAGER LEAVE MANAGEMENT ---
export const fetchPendingRequestsApi = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/manager/demandes-attente/`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des demandes en attente")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const validateLeaveRequestApi = async (requestId: number, status: "validé" | "refusé"): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/manager/valider-demande/${requestId}/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erreur lors de la validation de la demande")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}
// --- Profile Update ---
export const testAuthenticationApi = async (): Promise<any> => {
  try {
    const token = localStorage.getItem("accessToken")
    console.log("🔍 Test d'authentification...")
    console.log("Token présent:", !!token)
    console.log("Token (premiers caractères):", token?.substring(0, 20) + "...")

    const response = await fetch(`${API_BASE_URL}/auth/user/profile/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Statut de réponse:", response.status)
    const data = await response.json()
    console.log("Données de réponse:", data)

    return { success: response.ok, data, status: response.status }
  } catch (error) {
    console.error("Erreur lors du test d'authentification:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export const changePasswordApi = async (oldPassword: string, newPassword: string): Promise<any> => {
  try {
    const token = localStorage.getItem("accessToken")

    // Diagnostic complet
    console.log("🔍 DIAGNOSTIC CHANGEMENT MOT DE PASSE")
    console.log("================================")
    console.log("1. Token présent:", !!token)
    console.log("2. Token valide:", token && token.length > 10)
    console.log("3. Token (début):", token?.substring(0, 30) + "...")
    console.log("4. URL cible:", `${API_BASE_URL}/auth/user/change-password/`)

    // Verifier que le token existe
    if (!token) {
      throw new Error("Session expirée. Veuillez vous reconnecter.")
    }

    // Test d'authentification 
    console.log("5. Test d'authentification préalable...")
    const authTest = await testAuthenticationApi()
    console.log("6. Résultat du test auth:", authTest)

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    console.log("7. Headers envoyés:", headers)

    const payload = {
      old_password: oldPassword,
      new_password: newPassword,
    }

    console.log("8. Payload (masqué):", {
      old_password: "***",
      new_password: "***",
    })

    const response = await fetch(`${API_BASE_URL}/auth/user/change-password/`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    console.log("9. Statut de la réponse:", response.status)
    console.log("10. Headers de réponse:", Object.fromEntries(response.headers.entries()))

    // Gérer spécifiquement l'erreur 401
    if (response.status === 401) {
      console.error(" ERREUR 401 - Token invalide ou expiré")

      // Essayer de recuperer plus d'infos sur l'erreur
      const errorText = await response.text()
      console.error("11. Détails de l'erreur 401:", errorText)

      // Token expire ou invalide
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("currentUser")
      throw new Error("Session expirée. Veuillez vous reconnecter.")
    }

    const data = await response.json()
    console.log("12. Données de réponse:", data)

    if (!response.ok) {
      
      if (typeof data === "object" && data !== null) {
        const errorMessages: string[] = []
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(" ")}`)
          } else if (typeof messages === "string") {
            errorMessages.push(`${field}: ${messages}`)
          }
        })
        if (errorMessages.length > 0) {
          throw new Error(errorMessages.join(", "))
        }
      }

      throw new Error(data.error || data.detail || "Erreur lors du changement de mot de passe")
    }

    console.log("Changement de mot de passe réussi!")
    return data
  } catch (error) {
    console.error(" Erreur lors du changement de mot de passe:", error)
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}



export const updateUserProfileApi = async (profileData: {
  prenom: string
  nom: string
  email: string
}): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/user/update/`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    })

    const data = await response.json()

    if (!response.ok) {
     
      if (typeof data === "object" && data !== null) {
        const errorMessages: string[] = []
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            errorMessages.push(`${field}: ${messages.join(" ")}`)
          } else if (typeof messages === "string") {
            errorMessages.push(`${field}: ${messages}`)
          }
        })
        if (errorMessages.length > 0) {
          throw new Error(errorMessages.join(", "))
        }
      }

      throw new Error(data.error || "Erreur lors de la mise à jour du profil")
    }

    return data
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}




// --- LEAVE MANAGEMENT ---
export const fetchTeamRulesApi = async (teamId: number): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/regles-conge/?equipe=${teamId}`, {
      headers: getAuthHeaders(),
    })

    if (response.status === 403) {
      throw new Error("Accès refusé. Vous n'avez pas les permissions pour accéder aux règles de cette équipe.")
    }

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des règles d'équipe")
    }

    const data = await response.json()
    console.log("Règles d'équipe récupérées:", data)
    return data.length > 0 ? data[0] : null
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const fetchFormulasApi = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/formules/`, {
      headers: getAuthHeaders(),
    })
    console.log("fetchFormulasApi response status:", response.status)
    if (response.status === 403) {
      throw new Error("Accès refusé. Vous n'avez pas les permissions pour accéder aux formules.")
    }

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération des formules")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

// Ajouter une fonction pour récupérer les équipes du manager
export const fetchManagerTeamsApi = async (): Promise<any[]> => {
  try {
    // Essayer d'abord l'endpoint spécifique aux managers
    let response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/manager/mes-equipes/`, {
      headers: getAuthHeaders(),
    })

   
    if (response.status === 404) {
      response = await fetch(`${API_BASE_URL}/gestion-utilisateurs/equipes/`, {
        headers: getAuthHeaders(),
      })
    }

    if (response.status === 403) {
      throw new Error("Accès refusé. Vous n'avez pas les permissions de manager.")
    }

    if (!response.ok) {
      throw new Error("Erreur lors de la récupération de vos équipes")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export const saveTeamRulesApi = async (teamId: number, rulesData: any, isUpdate: boolean): Promise<any> => {
  try {
    const url = isUpdate
      ? `${API_BASE_URL}/gestion-absences-conges/regles-conge/${rulesData.id || teamId}/`
      : `${API_BASE_URL}/gestion-absences-conges/regles-conge/`

    const response = await fetch(url, {
      method: isUpdate ? "PUT" : "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(rulesData),
    })

    if (response.status === 403) {
      throw new Error("Accès refusé. Vous n'avez pas les permissions pour modifier les règles de cette équipe.")
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erreur lors de la sauvegarde des règles")
    }

    return await response.json()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

// --- CALENDAR DATA ---
export const fetchCalendarDataApi = async (year: number, month: number): Promise<any> => {
  try {
    console.log(`🔍 Récupération calendrier pour ${month}/${year}`)

    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/calendrier/?year=${year}&month=${month}`, {
      headers: getAuthHeaders(),
    })

    console.log("Statut réponse calendrier:", response.status)

    if (!response.ok) {
      throw new Error("Erreur lors du chargement des données du calendrier")
    }

    const data = await response.json()
    console.log("Données calendrier reçues:", data)

    return data
  } catch (error) {
    console.error("Erreur API calendrier:", error)
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

// Fonction de debug 
export const debugHolidaysApi = async (): Promise<any> => {
  try {
    console.log(" Debug des jours fériés...")

    const response = await fetch(`${API_BASE_URL}/gestion-absences-conges/debug-holidays/`, {
      headers: getAuthHeaders(),
    })

    console.log(" Statut réponse debug:", response.status)

    if (!response.ok) {
      throw new Error("Erreur lors du debug des jours fériés")
    }

    const data = await response.json()
    console.log(" Données debug reçues:", data)

    return data
  } catch (error) {
    console.error(" Erreur debug holidays:", error)
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}



// GESTION DES SOLDES 
export const fetchEmployeeSoldeHistory = async (userId: number): Promise<SoldeHistory[]> => {
  
  const response = await api.get(`${API_BASE_URL}/gestion-absences-conges/admin/historique-soldes/${userId}/`, {
    headers: getAuthHeaders(),
    
  });
  console.log("fetchEmployeeSoldeHistory response:", response.data);
  return response.data;
};

export const fetchAllCurrentSoldes = async (): Promise<EmployeeCurrentSolde[]> => {
  console.log("tocken:", localStorage.getItem("accessToken"));
  const response = await api.get(`${API_BASE_URL}/gestion-absences-conges/admin/historique-soldes/`, {
    headers: getAuthHeaders(),
  });
  console.log("fetchEmployeeSoldeHistory response:", response.data);
  return response.data;
};


//Employe Dashboard
export const getCurrentWeekImputations = async (): Promise<WeeklyImputation> => {
  const response = await api.get('/gestion-imputations-projet/employe/imputations/semaine_courante/', {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const submitWeek = async (): Promise<void> => {
  await api.post('/gestion-imputations-projet/employe/imputations/soumettre_semaine/', {}, {
    headers: getAuthHeaders()
  });
};

export const getMonthlySummary = async (year: number, month: number): Promise<MonthlySummary> => {
  const response = await api.get('/gestion-imputations-projet/employe/imputations/synthese_mensuelle/', {
    params: { year, month },
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const response = await api.get('/gestion-absences-conges/mes-demandes/', {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const getCurrentSolde = async (): Promise<EmployeeCurrentSolde> => {
  const response = await api.get('/gestion-absences-conges/mon-solde/', {
    headers: getAuthHeaders()
  });
  console.log(response.data)
  return response.data;
};

export const getManagerDashboard = async (): Promise<ManagerDashboardData> => {
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/gestion-imputations-projet/manager/dashboard/`,
      { headers: getAuthHeaders() }
    );
    console.log('[getManagerDashboard] Data:', data);

    // On renomme chaque semaine.employe → semaine.employe_id
    const semainesAvecEmployeeId = (data.semaines_a_valider ?? []).map((s: any) => ({
      ...s,
      employe_id: s.employe,
      // conserve aussi employe_nom si besoin
      employe_nom: s.employe_nom,
    }));

    return {
      semaines_a_valider: semainesAvecEmployeeId,
      charge_par_projet:     data.charge_par_projet     ?? {},
      charge_par_categorie:  data.charge_par_categorie  ?? {},
      charge_par_employe:    data.charge_par_employe    ?? {},
      projets_en_retard:     data.projets_en_retard     ?? 0,
      periode:               data.periode               ?? '',
      equipes:               data.equipes               ?? []
    };
  } catch (err) {
    console.error('[getManagerDashboard]', err);
    throw new Error('Erreur lors de la récupération du tableau de bord');
  }
};


/**
 * Valide ou rejette une semaine d'imputation
 */
export const validateWeek = async (
  weekId: number,
  action: 'valider' | 'rejeter',
  commentaire = ''
): Promise<void> => {
  
  if (action === 'rejeter' && !commentaire.trim()) {
    throw new Error('Veuillez indiquer un motif de rejet.');
  }

  try {
    await axios.post(
  
      `${API_BASE_URL}/gestion-imputations-projet/manager/dashboard/${weekId}/valider-semaine/`,
      { action, commentaire: commentaire },
      { headers: getAuthHeaders() }
    );
    console.log("validation avec le commentaire:",commentaire )
  } catch (error: any) {
    console.error('[validateWeek] API error:', error?.response?.data || error);
    throw new Error(
      error?.response?.data?.detail ||
      `Erreur lors ${action === 'valider' ? 'de la validation' : 'du rejet'} de la semaine`
    );
  }
};

/**
 * Génère un rapport d'équipe
 */
export const getTeamReport = async (params: ReportParams): Promise<ReportData> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/gestion-imputations-projet/manager/reporting/`,
      {
        params: {
          date_debut: params.dateDebut,
          date_fin: params.dateFin,
          projet_id: params.projetId,
          format: params.format
        },
        headers: getAuthHeaders()
      }
    );

    // Gestion des differents formats
    switch (params.format) {
      case 'csv':
        return {
          downloadUrl: response.data.download_url,
          data: response.data
        };
      case 'pdf':
        return {
          downloadUrl: response.data.download_url,
          data: response.data
        };
      default:
        return response.data;
    }
  } catch (error) {
    console.error('Error generating team report:', error);
    throw new Error('Erreur lors de la génération du rapport');
  }
};

/**
 * Télécharge un fichier
 */
export const downloadReportFile = (url: string, filename: string) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'rapport_equipe';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

// Gestion des projets
export const fetchEquipesDisponibles = async (): Promise<Equipe[]> => {
    try {
        const response = await api.get('/gestion-imputations-projet/projets/equipes_disponibles/');
        return response.data;
    } catch (error) {
        console.error('Error fetching equipes:', error);
        throw new Error('Impossible de charger la liste des équipes');
    }
};

export const createProject = async (projectData: ProjetFormData): Promise<Projet> => {
    try {
        const response = await api.post('/gestion-imputations-projet/projets/', projectData);
        return response.data;
    } catch (error) {
        const err = error as any;
        console.error('Error creating project:', err.response?.data);
        throw new Error(err.response?.data?.detail || 'Erreur lors de la création du projet');
    }
};
export const fetchProjects = async (): Promise<Projet[]> => {
  try {
    const response = await api.get('/gestion-imputations-projet/projets/', {
      headers: getAuthHeaders(),
      params: {
        
      }
    });
    console.log(response.data)
   
    if (!Array.isArray(response.data)) {
      throw new Error('Format de réponse inattendu');
    }

 
    const projets: Projet[] = response.data.map((projet: any) => ({
      ...projet,
    
      date_debut: projet.date_debut || '',
      date_fin: projet.date_fin || '',
      // Assure la coherence des types
      taux_horaire: Number(projet.taux_horaire) || 0,
      equipe: projet.equipe ? {
        id: projet.equipe.id,
        nom: projet.equipe.nom || '',
        description: projet.equipe.description || '',
        manager: projet.equipe.manager || null,
        membres: projet.equipe.membres || [],
        status: projet.equipe.status || 'active',
        date_creation: projet.equipe.date_creation || ''
      } : null
    }));

    return projets;

  } catch (error) {
    console.error('Erreur lors de la récupération des projets:', error);
    
    // Gestion des erreurs 
    const err = error as any;
    if (err.response) {
      switch (err.response.status) {
        case 401:
          throw new Error('Authentification requise');
        case 403:
          throw new Error('Permissions insuffisantes');
        case 404:
          throw new Error('Endpoint non trouvé');
        default:
          throw new Error(`Erreur serveur: ${err.response.status}`);
      }
    } else if (err.request) {
      throw new Error('Pas de réponse du serveur');
    } else {
      throw new Error('Erreur de configuration de la requête');
    }
  }
};

// --- TIME TRACKING API ---

export const fetchEmployeeProjects = async (): Promise<Projet[]> => {
  const response = await api.get('/gestion-imputations-projet/projets/', {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const fetchWeekTimeEntries = async (weekStart: string): Promise<WeeklyImputation> => {
  const response = await api.get('/gestion-imputations-projet/employe/imputations/semaine_courante/', {
    headers: getAuthHeaders(),
    params: { date_debut: weekStart }
  });
  return response.data;
};

export const submitTimeEntry = async (entry: TimeEntryData): Promise<TimeEntryData> => {
  const response = await api.post('/gestion-imputations-projet/employe/imputations/', entry, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const fetchMonthlySummary = async (year: number, month: number): Promise<MonthlySummary> => {
  const response = await api.get('/gestion-imputations-projet/synthese_mensuelle/', {
    headers: getAuthHeaders(),
    params: { year, month }
  });
  return response.data;
};

export const fetchTimeEntriesHistory = async (params: ReportParams): Promise<ReportData[]> => {
  const response = await api.get('/gestion-imputations-projet/employe/imputations/historique/', {
    headers: getAuthHeaders(),
    params
  });
  return response.data;
};

export const exportTimeEntries = async (params: ReportParams, format: 'pdf' | 'csv' | 'json'): Promise<Blob> => {
  const response = await api.get('/gestion-imputations-projet/manager/dashboard/reporting/', {
    headers: getAuthHeaders(),
    responseType: 'blob',
    params: { ...params, format }
  });
  return response.data;
};

export const submitWeeklyImputations = async (
  semaine: number, 
  annee: number, 
  employeId?: number
): Promise<void> => {
  await api.post(
    '/gestion-imputations-projet/employe/imputations/soumettre_semaine/',
    { semaine, annee, employe_id: employeId },
    { headers: getAuthHeaders() }
  );
};


export interface WeekImputation {
  date: string;
  projetId: number;
  heures: number;
  categorie: string;
}

export const fetchWeeklyImputationsApi = async (): Promise<WeeklyImputation> => {
  const response = await api.get("/gestion-imputations-projet/employe/imputations/semaine_courante/", {
    headers: getAuthHeaders(),
  });
  

  return {
    imputations: response.data.imputations.map((imp: any) => ({
      id: imp.id.toString(),
      date: imp.date,
      projet: {
        id: imp.projet.id.toString(),
        nom: imp.projet.nom,
      },
      heures: parseFloat(imp.heures),
      categorie: imp.categorie,
    })),
    semaine_status: response.data.semaine_status,
    dates_semaine: response.data.dates_semaine,
  };
};

/**
 *  la liste des projets disponibles pour l'employe
 */
export const fetchEmployeeProjectsApi = async (): Promise<Projet[]> => {
  const response = await api.get("/gestion-imputations-projet/employe/imputations/projets_employe/", {
    headers: getAuthHeaders(),
  });
  
  // Transformer ldata pour correspondre à l'interface Projet
  return response.data.map((projet: any) => ({
    id: projet.id,
    identifiant: projet.code || "",
    nom: projet.nom,
    description: projet.description || "",
    date_debut: projet.date_debut || "",
    date_fin: projet.date_fin || "",
    taux_horaire: parseFloat(projet.taux_horaire) || 0,
    categorie: projet.categorie || "interne",
    equipe: projet.equipe, 
    actif: projet.actif !== false, 
    created_by: projet.created_by, 
  }));
};


export const submitWeeklyImputationsApi = async (): Promise<{ status: 'soumis' | 'valide' | 'rejete' }> => {
  const response = await api.post(
    "/gestion-imputations-projet/employe/imputations/soumettre_semaine/", 
    {}, 
    { headers: getAuthHeaders() }
  );
  return { status: response.data.status };
};


export const deleteImputationApi = async (imputationId: string): Promise<void> => {
  await api.delete(`/gestion-imputations-projet/employe/imputations/${imputationId}/`, {
    headers: getAuthHeaders(),
  });
};
export const fetchEmployeeTeamProjects = async (): Promise<Projet[]> => {
  const response = await api.get("/gestion-imputations-projet/employe-data/projets_equipes/");
  return response.data.map((projet: any) => ({
    id: projet.id,
    identifiant: projet.identifiant,
    nom: projet.nom,
    description: projet.description,
    date_debut: projet.date_debut,
    date_fin: projet.date_fin,
    taux_horaire: parseFloat(projet.taux_horaire),
    categorie: projet.categorie,
    actif: projet.actif
  }));
};
export const fetchEmployeeTrainings = async (): Promise<Formation[]> => {
  const response = await api.get(
    "/gestion-imputations-projet/employe/imputations/formations_employe/",{headers: getAuthHeaders(),}
  );

  return response.data;
};
export const fetchDailyImputations = async (date?: string): Promise<{
  date: string;
  imputations: ImputationHoraire[];
  total_heures: number;
}> => {
  try {
    console.log(`[fetchDailyImputations] Fetching imputations for date: ${date || 'current day'}`);
    
    const url = date 
      ? `${API_BASE_URL}/gestion-imputations-projet/imputations/journalieres/${date}/`
      : `${API_BASE_URL}/gestion-imputations-projet/imputations/journalieres/`;
    
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      params: {
        timestamp: Date.now() // Evite le cache
      }
    });

    console.log(`[fetchDailyImputations] Response for ${date}:`, response.data);
    
    if (!response.data || !Array.isArray(response.data.imputations)) {
      throw new Error('Réponse invalide du serveur');
    }

    return {
      date: response.data.date,
      imputations: response.data.imputations,
      total_heures: parseFloat(response.data.total_heures) || 0
    };
  } catch (error) {
    console.error(`[fetchDailyImputations] Error fetching imputations for ${date}:`, error);
    throw new Error(
      (typeof error === "object" && error !== null && "response" in error && typeof (error as any).response === "object" && (error as any).response !== null && "data" in (error as any).response && (error as any).response.data?.message) ||
      (typeof error === "object" && error !== null && "message" in error ? (error as any).message : String(error)) ||
      'Erreur lors de la récupération des imputations'
    );
  }
};

export const createImputation = async (data: Omit<ImputationHoraire, 'id'>): Promise<ImputationHoraire> => {
  try {
    console.log('[createImputation] Creating new imputation:', data);
    
    const response = await axios.post(
      `${API_BASE_URL}/gestion-imputations-projet/imputations/journalieres/`, 
      data,
      {
        headers: getAuthHeaders()
      }
    );

    console.log('[createImputation] Creation successful:', response.data);
    return response.data;
  } catch (error) {
    if (error && typeof error === "object" && "response" in error) {
      // @ts-expect-error: error is unknown, but we expect response property
      console.error('[createImputation] Error:', error.response?.data || error);
      // @ts-expect-error: error is unknown, but we expect response property
      throw new Error(error.response?.data?.message || 'Échec de la création de l\'imputation');
    } else {
      console.error('[createImputation] Error:', error);
      throw new Error('Échec de la création de l\'imputation');
    }
  }
};

export const updateImputation = async (
  id: number,
  data: Partial<ImputationHoraire>
): Promise<ImputationHoraire> => {
  try {
    
    const sendData: any = { ...data };

  
    if (sendData.projet && typeof sendData.projet === "object") {
      sendData.projet_id = sendData.projet.id;
      delete sendData.projet;
    }
  
    if (sendData.formation && typeof sendData.formation === "object") {
      sendData.formation_id = sendData.formation.id;
      delete sendData.formation;
    }

   
    if (sendData.categorie === "projet") {
      delete sendData.formation_id; // Pas de formation_id si projet
    }
    if (sendData.categorie === "formation") {
      delete sendData.projet_id;    // Pas de projet_id si formation
    }

    console.log(`[updateImputation] Updating imputation ${id} with:`, sendData);

    const response = await axios.patch(
      `${API_BASE_URL}/gestion-imputations-projet/imputations/${id}/`,
      sendData,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log(`[updateImputation] Update successful for ${id}:`, response.data);
    return response.data;
  } catch (error: any) {
    if (error && error.response) {
      console.error(`[updateImputation] Error updating ${id}:`, error.response?.data || error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        'Échec de la mise à jour de l\'imputation'
      );
    } else {
      console.error(`[updateImputation] Error updating ${id}:`, error);
      throw new Error('Échec de la mise à jour de l\'imputation');
    }
  }
};


export const deleteImputation = async (id: number): Promise<void> => {
  try {
    console.log(`[deleteImputation] Deleting imputation ${id}`);
    
    await axios.delete(
      `${API_BASE_URL}/gestion-imputations-projet/imputations/${id}/`,
      {
        headers: getAuthHeaders()
      }
    );

    console.log(`[deleteImputation] Deletion successful for ${id}`);
  } catch (error) {
    if (error && typeof error === "object" && "response" in error) {
      // @ts-expect-error: error is unknown, but we expect response property
      console.error(`[deleteImputation] Error deleting ${id}:`, error.response?.data || error);
      // @ts-expect-error: error is unknown, but we expect response property
      throw new Error(error.response?.data?.message || 'Échec de la suppression de l\'imputation');
    } else {
      console.error(`[deleteImputation] Error deleting ${id}:`, error);
      throw new Error('Échec de la suppression de l\'imputation');
    }
  }
};
export const createFormation = async (formData: FormData): Promise<Formation> => {
    try {
        const response = await api.post(
            '/gestion-imputations-projet/trainings/', 
            formData, 
            {
                
                withCredentials: true,
                headers: {
                    ...getAuthHeaders(),
                    
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Erreur création formation:', error.response?.data);
       
        throw new Error(
            error.response?.data?.detail ||
            error.response?.data?.intitule?.[0] ||
            error.response?.data?.non_field_errors?.[0] ||
            'Erreur lors de la création de la formation'
        );
    }
};
export const fetchWeeklyStatus = async (): Promise<WeekStatus> => {
  try {
    const res = await api.get(
      '/gestion-imputations-projet/employe/imputations/semaine_courante/',
      { headers: getAuthHeaders() }
    );

    const data = res.data;
    console.log('Weekly status data:', data);
    const statusMap: Record<string, WeekStatus['status']> = {
      brouillon: 'draft',
      soumis   : 'submitted',
      valide   : 'validated',
      rejete   : 'rejected',
    };

    return {
      status        : statusMap[data.semaine_status] ?? 'draft',
      submittedAt   : data.date_soumission,
      validatedAt   : data.date_validation,
      validatedBy   : data.valide_par
                      ? `${data.valide_par.prenom} ${data.valide_par.nom}`
                      : undefined,
      rejectedAt    : data.date_rejet,
      rejectionReason: data.commentaire,
      commentaire: data.commentaire, 
    };
  } catch (e) {
    console.error('Error fetching weekly status:', e);
    return { status: 'draft' };           // valeur de repli
  }
};

export const submitWeeklyTimesheet = async (): Promise<WeekStatus> => {
  try {
    await api.post(
      '/gestion-imputations-projet/employe/imputations/soumettre_semaine/',
      {},
      { headers: getAuthHeaders() }
    );

    return {
      status     : 'submitted',
      submittedAt: new Date().toISOString(),
    };
  } catch (e: any) {
    console.error('Error submitting weekly timesheet:', e);
    throw new Error(
      e.response?.data?.error
      ?? e.response?.data?.detail
      ?? 'Erreur lors de la soumission de la semaine'
    );
  }
};
export const fetchSubmittedImputationsManager = async (): Promise<any[]> => {
  try {
    const response = await api.get(
      '/gestion-imputations-projet/manager/imputations-soumis/',
      { headers: getAuthHeaders() }
    );
    return response.data;     
  } catch (error: any) {
    console.error('Erreur récupération imputations soumis :', error);
    throw new Error(
      error.response?.data?.detail ||
      'Impossible de récupérer les imputations soumises'
    );
  }
};
export const getManagerProjects = async (): Promise<LightProject[]> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/gestion-imputations-projet/manager/dashboard/projets/`,
      { headers: getAuthHeaders() }
    );
    return response.data; 
  } catch (error) {
    console.error('Error fetching manager projects:', error);
    throw new Error('Erreur lors de la récupération des projets');
  }
};
export const fetchManagerWeekEntries = async (
  employeeId: number,
  year: number,
  weekNumber: number
): Promise<{
  start_date: string;
  end_date: string;
  imputations: ImputationHoraire[];
  total_heures: number;
} | null> => {  // Changed from undefined to null
  try {
    const response = await api.get(
      `/gestion-imputations-projet/manager/imputations/employe/${employeeId}/semaine/${year}/${weekNumber}/entries/`,
      { headers: getAuthHeaders() }
    );
    console.log('Response from fetchManagerWeekEntries:', response.data);
    if (!response.data?.success) {
      throw new Error(response.data?.error || "Réponse API invalide");
    }

    return {
      start_date: response.data.start_date,
      end_date: response.data.end_date,
      imputations: response.data.imputations,
      total_heures: response.data.total_heures,
    };
    
  } catch (error) {
    console.error('Erreur fetchManagerWeekEntries:', error);
    return null;  
  }
};