import React, { useEffect, useState } from 'react';
import { Plus, Users, Pencil, X, AlertCircle, CheckCircle2, ChevronDown, Search, UserCheck, UserPlus } from 'lucide-react';
import { User, EquipeFormData, Equipe } from '../../types';

const TeamsManagement: React.FC = () => {
  const [teams, setTeams] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Formulaire (ajout ou édition)
  const [form, setForm] = useState<EquipeFormData>({
    id: 0,
    nom: '',
    description: '',
    manager: '',
    membres: [],
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [users, setUsers] = useState<User[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [touchedFields, setTouchedFields] = useState<{[key: string]: boolean}>({});
  
  // États pour les sélecteurs personnalisés
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [membersSearch, setMembersSearch] = useState('');

  // Validation en temps réel
  const validateField = (name: string, value: any) => {
    const errors: {[key: string]: string} = {};
    
    switch (name) {
      case 'nom':
        if (!value || value.trim().length < 2) {
          errors.nom = 'Le nom doit contenir au moins 2 caractères';
        } else if (value.trim().length > 50) {
          errors.nom = 'Le nom ne peut pas dépasser 50 caractères';
        }
        break;
      case 'description':
        if (value && value.length > 200) {
          errors.description = 'La description ne peut pas dépasser 200 caractères';
        }
        break;
      case 'manager':
        if (!value) {
          errors.manager = 'Veuillez sélectionner un manager';
        }
        break;
      case 'membres':
        if (!value || value.length === 0) {
          errors.membres = 'Veuillez sélectionner au moins un membre';
        }
        break;
    }
    
    return errors;
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Valider tous les champs
    Object.keys(form).forEach(key => {
      const fieldErrors = validateField(key, form[key as keyof typeof form]);
      Object.assign(errors, fieldErrors);
    });
    
    // Vérifier que le manager n'est pas dans les membres
    if (form.manager && form.membres.includes(Number(form.manager))) {
      errors.membres = 'Le manager ne peut pas être également membre de l\'équipe';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Chargement des équipes
  const fetchTeams = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:8000/gestion-utilisateurs/equipes/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Erreur lors du chargement des équipes.");
      const data = await res.json();
      console.log("Équipes chargées :", data); // Debug
      setTeams(data);
    } catch (err: any) {
      setError(err.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeams(); }, []);

  // Chargement des utilisateurs pour select manager/membres
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch("http://localhost:8000/gestion-utilisateurs/users/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs.");
        const data = await res.json();
        setUsers(data);
      } catch (err: any) {
        // Optionnel : affiche une erreur utilisateur si besoin
      }
    };
    fetchUsers();
  }, []);

  // Reset formulaire
  const resetForm = () => {
    setForm({
      id: 0,
      nom: '',
      description: '',
      manager: '',
      membres: [],
      status: 'active'
    });
    setEditId(null);
    setEditMode(false);
    setFormErrors({});
    setTouchedFields({});
    setShowManagerDropdown(false);
    setShowMembersDropdown(false);
    setManagerSearch('');
    setMembersSearch('');
  };

  // Pré-remplir pour édition
  const handleEditTeam = (team: Equipe) => {
    setForm({
      id: team.id,
      nom: team.nom || '',
      description: team.description || '',
      manager: team.manager ? team.manager.id : '',
      membres: team.membres ? team.membres.map(m => m.id) : [],
      status: team.status || 'active'
    });
    setEditId(team.id);
    setEditMode(true);
    setShowModal(true);
    setFormErrors({});
    setTouchedFields({});
    setShowManagerDropdown(false);
    setShowMembersDropdown(false);
    setManagerSearch('');
    setMembersSearch('');
  };

  // Form input avec validation
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const processedValue = name === "manager" ? Number(value) : value;
    
    setForm(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    
    // Validation en temps réel
    const fieldErrors = validateField(name, processedValue);
    setFormErrors(prev => {
      const updated = { ...prev, ...fieldErrors };
      if (Object.keys(fieldErrors).length === 0) {
        delete updated[name];
      }
      return updated;
    });
  };

  const handleMembresChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(opt => Number(opt.value));
    setForm(prev => ({
      ...prev,
      membres: selectedOptions
    }));
    
    setTouchedFields(prev => ({ ...prev, membres: true }));
    
    // Validation en temps réel
    const fieldErrors = validateField('membres', selectedOptions);
    setFormErrors(prev => {
      const updated = { ...prev, ...fieldErrors };
      if (Object.keys(fieldErrors).length === 0) {
        delete updated.membres;
      }
      return updated;
    });
  };

  // Gestionnaires pour les sélecteurs personnalisés
  const handleManagerSelect = (managerId: number) => {
    setForm(prev => ({ ...prev, manager: managerId }));
    setTouchedFields(prev => ({ ...prev, manager: true }));
    setShowManagerDropdown(false);
    setManagerSearch('');
    
    const fieldErrors = validateField('manager', managerId);
    setFormErrors(prev => {
      const updated = { ...prev, ...fieldErrors };
      if (Object.keys(fieldErrors).length === 0) {
        delete updated.manager;
      }
      return updated;
    });
  };

  const handleMemberToggle = (memberId: number) => {
    const newMembers = form.membres.includes(memberId)
      ? form.membres.filter(id => id !== memberId)
      : [...form.membres, memberId];
    
    setForm(prev => ({ ...prev, membres: newMembers }));
    setTouchedFields(prev => ({ ...prev, membres: true }));
    
    const fieldErrors = validateField('membres', newMembers);
    setFormErrors(prev => {
      const updated = { ...prev, ...fieldErrors };
      if (Object.keys(fieldErrors).length === 0) {
        delete updated.membres;
      }
      return updated;
    });
  };

  // Filtrer les utilisateurs pour les recherches
  const getFilteredManagers = () => {
    return users
      .filter(u => u.role === 'manager')
      .filter(u => 
        !managerSearch || 
        `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(managerSearch.toLowerCase())
      );
  };

  const getFilteredEmployees = () => {
    return users
      .filter(u => u.role === 'employe')
      .filter(u => 
        !membersSearch || 
        `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(membersSearch.toLowerCase())
      );
  };

  const getSelectedManager = () => {
    return users.find(u => u.id === Number(form.manager));
  };

  const getSelectedMembers = () => {
    return users.filter(u => form.membres.includes(u.id));
  };

  // Ajout ou édition
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Marquer tous les champs comme touchés
    const allFields = Object.keys(form).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as {[key: string]: boolean});
    setTouchedFields(allFields);
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const url = editMode
        ? `http://localhost:8000/gestion-utilisateurs/equipes/${editId}/`
        : "http://localhost:8000/gestion-utilisateurs/equipes/";
      const method = editMode ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Erreur lors de l'enregistrement.");
      }
      await fetchTeams();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setFormErrors({ submit: err.message || "Erreur inattendue" });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Composant pour les champs avec validation
  const FormField: React.FC<{
    label: string;
    name: string;
    children: React.ReactNode;
    required?: boolean;
    help?: string;
  }> = ({ label, name, children, required = false, help }) => {
    const hasError = touchedFields[name] && formErrors[name];
    const isValid = touchedFields[name] && !formErrors[name] && form[name as keyof typeof form];
    
    return (
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-brown-800">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          {children}
          {hasError && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
          {isValid && !hasError && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          )}
        </div>
        {hasError && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {formErrors[name]}
          </p>
        )}
        {help && !hasError && (
          <p className="text-xs text-brown-500">{help}</p>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-brown-900 flex items-center">
          <Users className="mr-2" /> Gestion des équipes
        </h2>
        <button
          className="flex items-center px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          onClick={() => { setShowModal(true); resetForm(); }}
        >
          <Plus className="mr-1" /> Nouvelle équipe
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600"></div>
          <span className="ml-2 text-brown-600">Chargement...</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-brown-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-brown-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-brown-800">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-brown-800">Manager</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-brown-800">Membres</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-brown-800">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-brown-800">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brown-100">
              {teams.map(team => (
                <tr key={team.id} className="hover:bg-brown-25 transition-colors duration-150">
                  <td className="px-4 py-3 font-medium text-brown-900">{team.nom}</td>
                  <td className="px-4 py-3 text-brown-700">
                    {team.manager ? `${team.manager.prenom} ${team.manager.nom}` : 
                      <span className="text-brown-400 italic">Non attribué</span>}
                  </td>
                  <td className="px-4 py-3 text-brown-700 max-w-xs">
                    {team.membres && Array.isArray(team.membres) && team.membres.length > 0
                      ? team.membres.map(m => `${m.prenom} ${m.nom}`).join(", ")
                      : <span className="text-brown-400 italic">Aucun membre</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      team.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-brown-100 text-brown-800'
                    }`}>
                      {team.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="inline-flex items-center text-brown-600 hover:bg-brown-100 px-3 py-1 rounded-md transition-colors duration-150"
                      onClick={() => handleEditTeam(team)}
                    >
                      <Pencil className="h-4 w-4 mr-1" /> Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal d'ajout / édition amélioré */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header du modal */}
            <div className="flex items-center justify-between p-6 border-b border-brown-100">
              <h3 className="text-xl font-bold text-brown-900">
                {editMode ? "Modifier l'équipe" : "Créer une équipe"}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-brown-400 hover:text-brown-600 transition-colors duration-150"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Corps du formulaire */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* Clic à l'extérieur pour fermer les dropdowns */}
              <div 
                onClick={() => {
                  setShowManagerDropdown(false);
                  setShowMembersDropdown(false);
                }}
                className="fixed inset-0 z-[-1]"
                style={{ display: showManagerDropdown || showMembersDropdown ? 'block' : 'none' }}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nom de l'équipe */}
                <div className="md:col-span-2">
                  <FormField label="Nom de l'équipe" name="nom" required>
                    <input
                      type="text"
                      name="nom"
                      value={form.nom}
                      onChange={handleFormChange}
                      className={`w-full px-4 py-3 border rounded-lg transition-colors duration-150 ${
                        touchedFields.nom && formErrors.nom
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : touchedFields.nom && !formErrors.nom && form.nom
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                          : 'border-brown-200 focus:border-brown-500 focus:ring-brown-200'
                      } focus:outline-none focus:ring-2`}
                      placeholder="Nom de l'équipe"
                    />
                  </FormField>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <FormField 
                    label="Description" 
                    name="description"
                    help={`${(form.description || '').length}/200 caractères`}
                  >
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleFormChange}
                      rows={3}
                      className={`w-full px-4 py-3 border rounded-lg transition-colors duration-150 resize-none ${
                        touchedFields.description && formErrors.description
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : 'border-brown-200 focus:border-brown-500 focus:ring-brown-200'
                      } focus:outline-none focus:ring-2`}
                      placeholder="Description de l'équipe (optionnel)"
                    />
                  </FormField>
                </div>

                {/* Manager */}
                <FormField label="Manager" name="manager" required>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManagerDropdown(!showManagerDropdown);
                        setShowMembersDropdown(false);
                      }}
                      className={`w-full px-4 py-3 border rounded-lg transition-colors duration-150 flex items-center justify-between ${
                        touchedFields.manager && formErrors.manager
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : touchedFields.manager && !formErrors.manager && form.manager
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                          : 'border-brown-200 focus:border-brown-500 focus:ring-brown-200'
                      } focus:outline-none focus:ring-2 text-left`}
                    >
                      <span className={getSelectedManager() ? 'text-brown-900' : 'text-brown-400'}>
                        {getSelectedManager() 
                          ? `${getSelectedManager()!.prenom} ${getSelectedManager()!.nom}`
                          : 'Sélectionner un manager'
                        }
                      </span>
                      <ChevronDown 
                        className={`h-5 w-5 text-brown-400 transition-transform duration-200 ${
                          showManagerDropdown ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                    
                    {showManagerDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-brown-200 rounded-lg shadow-lg z-10 max-h-64 overflow-hidden">
                        <div className="p-3 border-b border-brown-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brown-400" />
                            <input
                              type="text"
                              placeholder="Rechercher un manager..."
                              value={managerSearch}
                              onChange={(e) => setManagerSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-brown-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brown-200 focus:border-brown-500"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {getFilteredManagers().length > 0 ? (
                            getFilteredManagers().map(manager => (
                              <button
                                key={manager.id}
                                type="button"
                                onClick={() => handleManagerSelect(manager.id)}
                                className={`w-full px-4 py-3 text-left hover:bg-brown-50 flex items-center transition-colors duration-150 ${
                                  Number(form.manager) === manager.id ? 'bg-brown-100 text-brown-900' : 'text-brown-700'
                                }`}
                              >
                                <UserCheck className="h-4 w-4 mr-2 text-brown-500" />
                                <div>
                                  <div className="font-medium">{manager.prenom} {manager.nom}</div>
                                  <div className="text-sm text-brown-500">{manager.email}</div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-brown-500 text-center">
                              Aucun manager trouvé
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </FormField>

                {/* Statut */}
                <FormField label="Statut" name="status">
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-brown-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-200 focus:border-brown-500 transition-colors duration-150"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </FormField>

                {/* Membres */}
                <div className="md:col-span-2">
                  <FormField 
                    label="Membres de l'équipe" 
                    name="membres" 
                    required
                    help={`${form.membres.length} membre(s) sélectionné(s)`}
                  >
                    <div className="space-y-3">
                      {/* Membres sélectionnés */}
                      {getSelectedMembers().length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-brown-50 rounded-lg border border-brown-200">
                          {getSelectedMembers().map(member => (
                            <span
                              key={member.id}
                              className="inline-flex items-center px-3 py-1 bg-brown-200 text-brown-800 rounded-full text-sm"
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              {member.prenom} {member.nom}
                              <button
                                type="button"
                                onClick={() => handleMemberToggle(member.id)}
                                className="ml-2 text-brown-600 hover:text-brown-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Sélecteur de membres */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setShowMembersDropdown(!showMembersDropdown);
                            setShowManagerDropdown(false);
                          }}
                          className={`w-full px-4 py-3 border rounded-lg transition-colors duration-150 flex items-center justify-between ${
                            touchedFields.membres && formErrors.membres
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                              : touchedFields.membres && !formErrors.membres && form.membres.length > 0
                              ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                              : 'border-brown-200 focus:border-brown-500 focus:ring-brown-200'
                          } focus:outline-none focus:ring-2 text-left`}
                        >
                          <span className="text-brown-700 flex items-center">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Ajouter des membres
                          </span>
                          <ChevronDown 
                            className={`h-5 w-5 text-brown-400 transition-transform duration-200 ${
                              showMembersDropdown ? 'rotate-180' : ''
                            }`} 
                          />
                        </button>
                        
                        {showMembersDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-brown-200 rounded-lg shadow-lg z-10 max-h-80 overflow-hidden">
                            <div className="p-3 border-b border-brown-100">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brown-400" />
                                <input
                                  type="text"
                                  placeholder="Rechercher un employé..."
                                  value={membersSearch}
                                  onChange={(e) => setMembersSearch(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-brown-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brown-200 focus:border-brown-500"
                                />
                              </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              {getFilteredEmployees().length > 0 ? (
                                getFilteredEmployees().map(employee => {
                                  const isSelected = form.membres.includes(employee.id);
                                  const isManager = Number(form.manager) === employee.id;
                                  
                                  return (
                                    <button
                                      key={employee.id}
                                      type="button"
                                      onClick={() => !isManager && handleMemberToggle(employee.id)}
                                      disabled={isManager}
                                      className={`w-full px-4 py-3 text-left flex items-center transition-colors duration-150 ${
                                        isManager 
                                          ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                          : isSelected 
                                          ? 'bg-brown-100 text-brown-900 hover:bg-brown-150' 
                                          : 'text-brown-700 hover:bg-brown-50'
                                      }`}
                                    >
                                      <div className={`w-4 h-4 mr-3 border-2 rounded ${
                                        isSelected && !isManager
                                          ? 'bg-brown-600 border-brown-600' 
                                          : 'border-brown-300'
                                      } flex items-center justify-center`}>
                                        {isSelected && !isManager && (
                                          <CheckCircle2 className="h-3 w-3 text-white" />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium">{employee.prenom} {employee.nom}</div>
                                        <div className="text-sm text-brown-500">
                                          {employee.email}
                                          {isManager && ' (Manager de cette équipe)'}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-4 py-3 text-brown-500 text-center">
                                  Aucun employé trouvé
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </FormField>
                </div>
              </div>

              {/* Erreur générale */}
              {formErrors.submit && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  {formErrors.submit}
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-brown-100">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-6 py-2 border border-brown-300 text-brown-700 rounded-lg hover:bg-brown-50 transition-colors duration-150"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center"
                  disabled={submitLoading || Object.keys(formErrors).some(key => key !== 'submit' && formErrors[key])}
                >
                  {submitLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {submitLoading
                    ? editMode ? "Modification..." : "Création..."
                    : editMode ? "Modifier l'équipe" : "Créer l'équipe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsManagement;