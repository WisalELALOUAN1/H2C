import * as React from 'react';
import  { useState, useEffect } from 'react'
import { X } from 'lucide-react';
import { User, UserFormData } from '../../types';



interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: UserFormData) => void;
  user?: User | null;
  errors?: { [key: string]: string };
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen, onClose, onSubmit, user, errors = {},
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    nom: '',
    prenom: '',
    role: 'employe',
    password: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        nom: user.nom || '',
        prenom: user.prenom || '',
        role: user.role || 'employe',
        password: '',
      });
    } else {
      setFormData({
        username: '',
        email: '',
        nom: '',
        prenom: '',
        role: 'employe',
        password: '',
      });
    }
  }, [user, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-brown-900">
            {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
          <button onClick={onClose} className="text-brown-400 hover:text-brown-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Affiche une erreur globale en haut */}
        {errors.global && (
          <div className="mb-2 text-red-600 text-center font-medium">{errors.global}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1">
                Prénom
              </label>
              <input
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.prenom ? 'border-red-300' : 'border-brown-200'} rounded-lg focus:outline-none focus:ring-brown-500 focus:border-brown-500`}
              />
              {errors.prenom && (
                <p className="text-red-500 text-xs mt-1">{errors.prenom}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-brown-700 mb-1">
                Nom
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.nom ? 'border-red-300' : 'border-brown-200'} rounded-lg focus:outline-none focus:ring-brown-500 focus:border-brown-500`}
              />
              {errors.nom && (
                <p className="text-red-500 text-xs mt-1">{errors.nom}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.username ? 'border-red-300' : 'border-brown-200'} rounded-lg focus:outline-none focus:ring-brown-500 focus:border-brown-500`}
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-brown-200'} rounded-lg focus:outline-none focus:ring-brown-500 focus:border-brown-500`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              Rôle
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-brown-200 rounded-lg focus:outline-none focus:ring-brown-500 focus:border-brown-500"
            >
              <option value="employe">Employé</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrateur</option>
            </select>
            {errors.role && (
              <p className="text-red-500 text-xs mt-1">{errors.role}</p>
            )}
          </div>

          

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-brown-300 text-brown-700 rounded-lg hover:bg-brown-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors"
            >
              {user ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;

