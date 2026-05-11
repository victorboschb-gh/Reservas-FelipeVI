'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ShieldOff, Mail } from 'lucide-react';

type BlacklistedEmail = {
  id: string;
  email: string;
  created_at: string;
};

export default function BlacklistedEmailsManager() {
  const [emails, setEmails] = useState<BlacklistedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blacklist');
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (err) {
      console.error('Error fetching blacklist:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const addEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newEmail.trim()) return;

    const res = await fetch('/api/admin/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail.trim() }),
    });

    const data = await res.json();

    if (res.ok) {
      setEmails(prev => [...prev, data].sort((a, b) => a.email.localeCompare(b.email)));
      setNewEmail('');
      setSuccess(`${data.email} añadido a la lista negra`);
    } else {
      setError(data.error || 'Error al añadir email');
    }
  };

  const removeEmail = async (id: string, email: string) => {
    if (!confirm(`¿Eliminar ${email} de la lista negra?`)) return;

    const res = await fetch(`/api/admin/blacklist?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setEmails(prev => prev.filter(e => e.id !== id));
      setSuccess(`${email} eliminado de la lista negra`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
        <ShieldOff className="w-5 h-5 text-red-500" />
        Lista Negra de Usuarios
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Los usuarios con estos emails no pueden hacer reservas. Se les mostrará un error al intentarlo.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>
      )}

      <form onSubmit={addEmail} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-gray-900"
          />
        </div>
        <button
          type="submit"
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          Bloquear
        </button>
      </form>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : emails.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <ShieldOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay usuarios en la lista negra.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {emails.map(e => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium border border-red-200"
            >
              <Mail className="w-3.5 h-3.5" />
              {e.email}
              <button
                onClick={() => removeEmail(e.id, e.email)}
                className="text-red-400 hover:text-red-600 transition-colors ml-1"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
