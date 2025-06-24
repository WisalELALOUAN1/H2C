import React, { useState } from 'react';

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
 
  const email =
    localStorage.getItem('firstLoginEmail') || localStorage.getItem('resetEmail') || '';

  
  console.log('ChangePassword : Email utilisé pour le changement de mot de passe :', email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirm) {
      setMessage('Les mots de passe ne correspondent pas');
      return;
    }

 
    console.log('Payload envoyé :', {
      email,
      new_password: newPassword,
    });

    // Appel API pour changement
    const resp = await fetch('http://localhost:8000/auth/first-password-change/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, new_password: newPassword }),
    });

    console.warn('Réponse brute du changement de mot de passe:', resp);

    let data = null;
    try {
      data = await resp.json();
      console.log('Données JSON du backend:', data);
    } catch (err) {
      console.error('Impossible de lire le JSON de la réponse:', err);
    }

    if (data && data.message) {
      setMessage('Mot de passe modifié, veuillez vous connecter');
  
      setTimeout(() => window.location.href = '/', 2000);
    } else {
      setMessage((data && data.error) || 'Erreur inattendue');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige-50">
      <form className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full" onSubmit={handleSubmit}>
        <h2 className="text-xl font-bold mb-4">Changer votre mot de passe</h2>
        <div className="mb-4">
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="form-input"
            placeholder="Nouveau mot de passe"
            required
          />
        </div>
        <div className="mb-4">
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="form-input"
            placeholder="Confirmer le mot de passe"
            required
          />
        </div>
        <button className="w-full bg-brown-600 text-white rounded-lg py-2" type="submit">
          Changer le mot de passe
        </button>
        {message && <div className="mt-4 text-center text-red-600">{message}</div>}
       
        <div className="mt-2 text-xs text-gray-400">
          Email  : <b>{email || '(vide)'}</b>
        </div>
      </form>
    </div>
  );
}
