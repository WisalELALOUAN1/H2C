"use client"
import  { useEffect, useState, useCallback, useMemo } from 'react';
import * as React from 'react';
import { X } from 'lucide-react';
import type { User, EquipeFormData } from '../../types';
import { fetchManagersApi, fetchEmployesApi, createTeamApi } from '../../services/api';

interface AddEquipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddEquipeModal: React.FC<AddEquipeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<EquipeFormData>({
    id: null,
    nom: '',
    description: '',
    manager: '',
    membres: [],
    status: 'active',
  });

  const [managers, setManagers] = useState<User[]>([]);
  const [employes, setEmployes] = useState<User[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  // Fonction de réinitialisation du formulaire mémorisée
  const resetForm = useCallback(() => {
    setFormData({
      id: null,
      nom: '',
      description: '',
      manager: '',
      membres: [],
      status: 'active',
    });
    setErrors({});
  }, []);

  // Fonction de chargement des données mémorisée
  const loadData = useCallback(async () => {
    try {
      const [managersData, employesData] = await Promise.all([
        fetchManagersApi(),
        fetchEmployesApi()
      ]);
      setManagers(managersData);
      setEmployes(employesData);
    } catch (error) {
      setErrors({ global: 'Erreur lors du chargement des données' });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadData();
    }
  }, [isOpen, resetForm, loadData]);

  // Gestionnaire de changement optimisé avec useCallback
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Effacer l'erreur uniquement si elle existe
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Gestionnaire pour la sélection multiple des membres
  const handleMembresChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions, (opt) => Number(opt.value));
    setFormData(prev => ({ ...prev, membres: values }));
    
    setErrors(prev => {
      if (prev.membres) {
        const newErrors = { ...prev };
        delete newErrors.membres;
        return newErrors;
      }
      return prev;
    });
  }, []);

  // Gestionnaire de soumission optimisé
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Le manager doit faire partie des membres
      let membres = formData.membres;
      if (formData.manager && !membres.includes(Number(formData.manager))) {
        membres = [...membres, Number(formData.manager)];
      }

      await createTeamApi({ ...formData, membres });
      onSuccess();
      onClose();
    } catch (error) {
      setErrors({ global: error instanceof Error ? error.message : 'Erreur lors de la création' });
    } finally {
      setLoading(false);
    }
  }, [formData, onSuccess, onClose]);

  // Mémorisation des options pour éviter les re-rendus
  const managerOptions = useMemo(() => (
    managers.map((mgr) => (
      <option key={mgr.id} value={mgr.id}>
        {mgr.prenom} {mgr.nom} ({mgr.email})
      </option>
    ))
  ), [managers]);

  const employeOptions = useMemo(() => (
    employes.map((emp) => (
      <option key={emp.id} value={emp.id}>
        {emp.prenom} {emp.nom} ({emp.email})
      </option>
    ))
  ), [employes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-brown-900">Créer une équipe</h2>
          <button onClick={onClose} className="text-brown-400 hover:text-brown-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {errors.global && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            {errors.global}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              Nom de l'équipe *
            </label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                errors.nom ? 'border-red-300' : 'border-brown-200'
              } rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500`}
              required
            />
            {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-brown-200 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              Manager *
            </label>
            <select
              name="manager"
              value={formData.manager}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                errors.manager ? 'border-red-300' : 'border-brown-200'
              } rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500`}
              required
            >
              <option value="">Sélectionner un manager</option>
              {managerOptions}
            </select>
            {errors.manager && <p className="text-red-500 text-xs mt-1">{errors.manager}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              Membres
            </label>
            <select
              multiple
              name="membres"
              value={formData.membres.map(String)}
              onChange={handleMembresChange}
              className={`w-full px-3 py-2 border ${
                errors.membres ? 'border-red-300' : 'border-brown-200'
              } rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500`}
              size={6}
            >
              {employeOptions}
            </select>
            <p className="text-xs text-brown-500 mt-1">
              Maintenez Ctrl (Cmd sur Mac) pour sélectionner plusieurs membres
            </p>
            {errors.membres && <p className="text-red-500 text-xs mt-1">{errors.membres}</p>}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-brown-300 text-brown-700 rounded-lg hover:bg-brown-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : "Créer l'équipe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEquipeModal;