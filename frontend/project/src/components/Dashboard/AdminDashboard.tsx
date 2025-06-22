"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Users, Shield, Plus, Edit } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import UserModal from "../UI/UserModal"
import type { User, UserFormData } from "../../types"
import {
  fetchUsersAdminApi,
  createUserApi,
  updateUserApi,
  toggleUserStatusApi,
  changeUserRoleApi,
} from "../../services/api"

const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [modalErrors, setModalErrors] = useState<{ [key: string]: string }>({})

  const fetchUsers = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await fetchUsersAdminApi()
      setUsers(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleUserStatus = async (userId: number, current: boolean) => {
    try {
      const updatedUser = await toggleUserStatusApi(userId, !current)
      setUsers((users) => users.map((u) => (u.id === userId ? { ...u, is_active: !current } : u)))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const changeUserRole = async (userId: number, newRole: "admin" | "manager" | "employe") => {
    try {
      const updatedUser = await changeUserRoleApi(userId, newRole)
      setUsers((users) => users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } catch (err: any) {
      setError(err.message || "Erreur inattendue")
    }
  }

  const handleCreateUser = async (userData: UserFormData) => {
    setModalErrors({})
    try {
      await createUserApi(userData)
      setShowUserModal(false)
      await fetchUsers()
    } catch (err: any) {
      // Gestion des erreurs de validation
      const errorMessage = err.message || "Une erreur réseau est survenue"

      // Si l'erreur contient des informations de champs spécifiques
      if (errorMessage.includes(":")) {
        const errors: { [key: string]: string } = {}
        const parts = errorMessage.split(", ")

        parts.forEach((part: string) => {
          const [field, message]: [string, string] = part.split(": ") as [string, string]
          if (field && message) {
            (errors as Record<string, string>)[field] = message
          } else {
            (errors as Record<string, string>).global = part
          }
        })

        setModalErrors(errors)
      } else {
        setModalErrors({ global: errorMessage })
      }
    }
  }

  const handleEditUser = async (userData: UserFormData) => {
    setModalErrors({})
    try {
      if (!editingUser) return

      const updatedUser = await updateUserApi(editingUser.id, userData)
      setUsers((users) => users.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)))
      setEditingUser(null)
      setShowUserModal(false)
      await fetchUsers()
    } catch (err: any) {
      // Gestion des erreurs de validation
      const errorMessage = err.message || "Une erreur réseau est survenue"

      if (errorMessage.includes(":")) {
        const errors: { [key: string]: string } = {}
        const parts = errorMessage.split(", ")

        parts.forEach((part: string) => {
          const [field, message]: [string, string] = part.split(": ") as [string, string]
          if (field && message) {
            (errors as Record<string, string>)[field] = message
          } else {
            (errors as Record<string, string>).global = part
          }
        })

        setModalErrors(errors)
      } else {
        setModalErrors({ global: errorMessage })
      }
    }
  }

  const openEditModal = (userToEdit: User) => {
    setEditingUser(userToEdit)
    setShowUserModal(true)
    setModalErrors({})
  }

  const closeModal = () => {
    setShowUserModal(false)
    setEditingUser(null)
    setModalErrors({})
  }

  const stats = [
    {
      icon: Users,
      label: "Total utilisateurs",
      value: users.length.toString(),
      color: "text-blue-600",
    },
    {
      icon: Shield,
      label: "Administrateurs",
      value: users.filter((u) => u.role === "admin").length.toString(),
      color: "text-red-600",
    },
    {
      icon: Users,
      label: "Managers",
      value: users.filter((u) => u.role === "manager").length.toString(),
      color: "text-purple-600",
    },
    {
      icon: Users,
      label: "Employés",
      value: users.filter((u) => u.role === "employe").length.toString(),
      color: "text-green-600",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Administration - {user?.prenom}</h1>
        <p className="text-brown-100 mt-2">Gérez les utilisateurs et les paramètres système</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <div className="text-red-600">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-beige-200">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg bg-gray-100 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-brown-600">{stat.label}</p>
                <p className="text-2xl font-bold text-brown-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-beige-200">
        <div className="p-6 border-b border-beige-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-brown-900">Gestion des utilisateurs</h3>
            <button
              onClick={() => {
                setShowUserModal(true)
                setModalErrors({})
                setEditingUser(null)
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvel utilisateur</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600"></div>
              <span className="ml-2 text-brown-600">Chargement...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-beige-200">
              <thead className="bg-beige-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brown-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-beige-200">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-beige-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-brown-900">
                          {userItem.prenom} {userItem.nom}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-900">{userItem.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                            userItem.role === "admin"
                              ? "bg-red-100 text-red-800"
                              : userItem.role === "manager"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {userItem.role}
                        </span>
                        <select
                          value={userItem.role}
                          className="border text-xs rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
                          onChange={(e) =>
                            changeUserRole(userItem.id, e.target.value as "admin" | "manager" | "employe")
                          }
                          disabled={userItem.id === user?.id}
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="employe">Employé</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(userItem.id, userItem.is_active)}
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full transition-colors ${
                          userItem.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        {userItem.is_active ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => openEditModal(userItem)}
                        className="text-brown-600 hover:text-brown-900 p-1 rounded hover:bg-brown-100 transition-colors"
                        title="Modifier l'utilisateur"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUserModal && (
        <UserModal
          isOpen={showUserModal}
          onClose={closeModal}
          onSubmit={editingUser ? handleEditUser : handleCreateUser}
          user={editingUser}
          errors={modalErrors}
        />
      )}
    </div>
  )
}

export default AdminDashboard
