import React, { useState, useEffect } from 'react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  existingRequest?: any;
}

const LeaveRequestForm: React.FC<Props> = ({ onClose, onSuccess, existingRequest }) => {
  const [form, setForm] = useState({
    type_demande: 'payé',
    date_debut: '',
    date_fin: '',
    demi_jour: false,
    commentaire: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | string[]>();

  useEffect(() => {
    if (existingRequest) {
      setForm({
        type_demande: existingRequest.type_demande,
        date_debut: existingRequest.date_debut,
        date_fin: existingRequest.date_fin,
        demi_jour: existingRequest.demi_jour,
        commentaire: existingRequest.commentaire,
      });
    }
  }, [existingRequest]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value,
    }));
  };

  const validateForm = () => {
    const errors: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!form.date_debut) errors.push("La date de début est obligatoire");
    if (!form.date_fin) errors.push("La date de fin est obligatoire");
    if (!form.commentaire.trim()) errors.push("Le commentaire est obligatoire");

    if (form.date_debut) {
      const startDate = new Date(form.date_debut);
      if (startDate < today) {
        errors.push("La date de début ne peut pas être dans le passé");
      }
    }

    if (form.date_debut && form.date_fin) {
      const startDate = new Date(form.date_debut);
      const endDate = new Date(form.date_fin);
      
      if (endDate < startDate) {
        errors.push("La date de fin doit être après la date de début");
      }
    }
    
    if (errors.length > 0) {
      setError(errors);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(undefined);
    
    const token = localStorage.getItem('accessToken');
    const url = existingRequest 
      ? `http://localhost:8000/gestion-absences-conges/demande-conge/${existingRequest.id}/`
      : 'http://localhost:8000/gestion-absences-conges/demande-conge/';
    const method = existingRequest ? 'PUT' : 'POST';

    try {
      const payload = {
        type_demande: form.type_demande,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        demi_jour: form.demi_jour,
        commentaire: form.commentaire.trim(),
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessages: string[] = [];
        
        if (typeof data === 'object') {
          for (const key in data) {
            if (Array.isArray(data[key])) {
              errorMessages.push(...data[key]);
            } else {
              errorMessages.push(data[key]);
            }
          }
        } else if (typeof data === 'string') {
          errorMessages.push(data);
        }

        setError(errorMessages.length > 0 ? errorMessages : 'Erreur inconnue');
        return;
      }

      onSuccess();
    } catch (err) {
      console.error("Erreur complète:", err);
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-stone-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-stone-50 px-8 py-6 border-b border-stone-200 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-stone-800">
                {existingRequest ? 'Modifier la demande' : 'Nouvelle demande'}
              </h3>
              <p className="text-stone-600 mt-1">
                {existingRequest ? 'Modifiez les détails de votre demande' : 'Formulaire de demande de congé/absence'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-stone-200 rounded-full transition-colors duration-200 text-stone-500 hover:text-stone-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-8 space-y-6">
          {/* Type de demande */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-stone-700">
              <svg className="w-4 h-4 mr-2 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
              Type d'absence *
            </label>
            <select 
              name="type_demande" 
              value={form.type_demande} 
              onChange={handleChange} 
              className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white hover:border-stone-400 transition-colors duration-200"
              required
            >
              <option value="payé">🏖️ Congé payé</option>
              <option value="spécial">⭐ Spécial</option>
              <option value="sans_solde">💰 Sans solde</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-stone-700">
                <svg className="w-4 h-4 mr-2 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
                Date de début *
              </label>
              <input 
                type="date" 
                name="date_debut" 
                value={form.date_debut} 
                onChange={handleChange} 
                className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 hover:border-stone-400 transition-colors duration-200" 
                required
                min={today}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-stone-700">
                <svg className="w-4 h-4 mr-2 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
                Date de fin *
              </label>
              <input 
                type="date" 
                name="date_fin" 
                value={form.date_fin} 
                onChange={handleChange} 
                className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 hover:border-stone-400 transition-colors duration-200" 
                required 
                min={form.date_debut || today}
              />
            </div>
          </div>

          {/* Demi-journée */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  name="demi_jour" 
                  checked={form.demi_jour} 
                  onChange={handleChange} 
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  form.demi_jour 
                    ? 'bg-amber-600 border-amber-600' 
                    : 'border-stone-300 hover:border-amber-400'
                }`}>
                  {form.demi_jour && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="ml-3">
                <span className="font-semibold text-stone-700">Demi-journée</span>
                <p className="text-sm text-stone-600">Cochez si votre demande concerne une demi-journée uniquement</p>
              </div>
            </label>
          </div>

          {/* Commentaire */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-stone-700">
              <svg className="w-4 h-4 mr-2 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
              Commentaire *
            </label>
            <textarea 
              name="commentaire" 
              value={form.commentaire} 
              onChange={handleChange} 
              className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 hover:border-stone-400 transition-colors duration-200 resize-none" 
              rows={4}
              placeholder="Veuillez indiquer la raison de votre demande (ex: vacances familiales, rendez-vous médical, etc.)..."
              required
            />
            <p className="text-xs text-stone-500">Minimum 10 caractères requis</p>
          </div>

          {/* Messages d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <div className="text-red-700">
                  <h4 className="font-semibold mb-1">Erreur de validation</h4>
                  {Array.isArray(error) 
                    ? error.map((err, i) => <div key={i} className="text-sm">• {err}</div>)
                    : <div className="text-sm">{error}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-stone-200">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 hover:border-stone-400 disabled:opacity-50 transition-all duration-200 font-medium"
              disabled={loading}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              onClick={handleSubmit}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 disabled:from-amber-300 disabled:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {existingRequest ? 'Mise à jour...' : 'Envoi en cours...'}
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  {existingRequest ? 'Mettre à jour' : 'Soumettre la demande'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestForm;