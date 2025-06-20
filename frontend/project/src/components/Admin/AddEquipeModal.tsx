import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { User, EquipeFormData } from "../../types";

interface AddEquipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EquipeFormData) => void;
  managers: User[];
  employes: User[];
  errors?: { [key: string]: string };
}

const AddEquipeModal: React.FC<AddEquipeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  managers,
  employes,
  errors = {},
}) => {
  const [formData, setFormData] = useState<EquipeFormData>({
    nom: "",
    description: "",
    manager: "",
    membres: [],
    status: "active",
  });

  useEffect(() => {
    // On réinitialise le formulaire à chaque ouverture
    if (isOpen) {
      setFormData({
        nom: "",
        description: "",
        manager: "",
        membres: [],
        status: "active",
      });
    }
  }, [isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMembresChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Multiselect pour membres
    const values = Array.from(e.target.selectedOptions, (opt) => Number(opt.value));
    setFormData((prev) => ({ ...prev, membres: values }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Le manager aussi doit faire partie des membres
    let membres = formData.membres;
    if (formData.manager && !membres.includes(Number(formData.manager))) {
      membres = [...membres, Number(formData.manager)];
    }
    onSubmit({ ...formData, membres });
  };

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
          <div className="mb-2 text-red-600 text-center font-medium">{errors.global}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">Nom de l’équipe</label>
            <input
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.nom ? "border-red-300" : "border-brown-200"} rounded-lg`}
            />
            {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-brown-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">Manager</label>
            <select
              name="manager"
              value={formData.manager}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-brown-200 rounded-lg"
              required
            >
              <option value="">Sélectionner un manager</option>
              {managers.map((mgr) => (
                <option key={mgr.id} value={mgr.id}>
                  {mgr.prenom} {mgr.nom} ({mgr.email})
                </option>
              ))}
            </select>
            {errors.manager && <p className="text-red-500 text-xs mt-1">{errors.manager}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">Membres</label>
            <select
              multiple
              name="membres"
              value={formData.membres.map(String)}
              onChange={handleMembresChange}
              className="w-full px-3 py-2 border border-brown-200 rounded-lg"
            >
              {employes.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.prenom} {emp.nom} ({emp.email})
                </option>
              ))}
            </select>
            {errors.membres && <p className="text-red-500 text-xs mt-1">{errors.membres}</p>}
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
              Créer l’équipe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEquipeModal;
