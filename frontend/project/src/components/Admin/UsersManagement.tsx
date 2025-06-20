import React, { useState } from 'react';
import { Users, Shield, Plus, Edit, Trash2, Search } from 'lucide-react';
import { User, UserFormData } from '../../types';
import UserModal from '../UI/UserModal';

const UsersManagement: React.FC = () => {
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      username: 'admin',
      email: 'admin@company.com',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      createdAt: '2024-01-01',
      isActive: true
    },
    {
      id: '2',
      username: 'manager',
      email: 'manager@company.com',
      role: 'manager',
      firstName: 'Manager',
      lastName: 'User',
      createdAt: '2024-01-01',
      isActive: true
    },
    {
      id: '3',
      username: 'employee',
      email: 'employee@company.com',
      role: 'employee',
      firstName: 'Employee',
      lastName: 'User',
      createdAt: '2024-01-01',
      isActive: true
    }
  ]);

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { icon: Users, label: 'Total utilisateurs', value: users.length.toString(), color: 'text-blue-600' },
    { icon: Shield, label: 'Administrateurs', value: users.filter(u => u.role === 'admin').length.toString(), color: 'text-red-600' },
    { icon: Users, label: 'Managers', value: users.filter(u => u.role === 'manager').length.toString(), color: 'text-purple-600' },
    { icon: Users, label: 'Employés', value: users.filter(u => u.role === 'employee').length.toString(), color: 'text-green-600' }
  ];

  const handleCreateUser = (userData: UserFormData) => {
    const newUser: User = {
      id: Date.now().toString(),
      username: userData.username,
      email: userData.email,
      role: userData.role,
      firstName: userData.firstName,
      lastName: userData.lastName,
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true
    };
    setUsers([...users, newUser]);
    setShowUserModal(false);
  };

  const handleEditUser = (userData: UserFormData) => {
    if (editingUser) {
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...userData }
          : u
      ));
      setEditingUser(null);
      setShowUserModal(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { ...u, isActive: !u.isActive }
        : u
    ));
  };

  const openEditModal = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setShowUserModal(true);
  };

  const closeModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brown-600 to-brown-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <p className="text-brown-100 mt-2">
          Créez, modifiez et gérez les comptes utilisateurs
        </p>
      </div>

      {/* Stats */}
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

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-beige-200">
        <div className="p-6 border-b border-beige-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h3 className="text-lg font-semibold text-brown-900">Liste des utilisateurs</h3>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brown-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-brown-200 rounded-lg focus:outline-none focus:ring-brown-500 focus:border-brown-500"
                />
              </div>
              
              {/* Add User Button */}
              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Nouvel utilisateur</span>
              </button>
            </div>
          </div>
        </div>

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
              {filteredUsers.map((userItem) => (
                <tr key={userItem.id} className="hover:bg-beige-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-brown-900">
                        {userItem.firstName} {userItem.lastName}
                      </div>
                      <div className="text-sm text-brown-500">@{userItem.username}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-900">
                    {userItem.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                      userItem.role === 'admin' 
                        ? 'bg-red-100 text-red-800'
                        : userItem.role === 'manager'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {userItem.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleUserStatus(userItem.id)}
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        userItem.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {userItem.isActive ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEditModal(userItem)}
                      className="text-brown-600 hover:text-brown-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(userItem.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUserModal && (
        <UserModal
          isOpen={showUserModal}
          onClose={closeModal}
          onSubmit={editingUser ? handleEditUser : handleCreateUser}
          user={editingUser}
        />
      )}
    </div>
  );
};

export default UsersManagement;