'use client';

import { useState } from 'react';
import { Check, X, Clock, Mail, AlertTriangle } from 'lucide-react';

type PendingReservation = {
  id: string;
  name: string;
  email: string;
  phone: string;
  portions: number;
  created_at: string;
  menu_date: string;
  menu_description: string;
};

export default function PendingApprovals({ reservations }: { reservations: PendingReservation[] }) {
  const [pending, setPending] = useState(reservations);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/reservations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setPending(prev => prev.filter(r => r.id !== id));
        setMessage({ type: 'success', text: `Reserva aprobada. Email de confirmación enviado.` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al aprobar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('¿Rechazar esta reserva? Se notificará al usuario por email.')) return;
    setActionLoading(id);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/reservations/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setPending(prev => prev.filter(r => r.id !== id));
        setMessage({ type: 'success', text: 'Reserva rechazada y notificada.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al rechazar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setActionLoading(null);
    }
  };

  if (pending.length === 0 && !message) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
          <Clock className="w-5 h-5 text-amber-500" />
          Usuarios Pendientes
        </h2>
        <div className="text-center py-6 text-gray-400">
          <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay usuarios pendientes de aprobación.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        Usuarios Pendientes
        <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
      </h2>

      {message && (
        <div className={`${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} p-3 rounded-lg mb-4 text-sm`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {pending.map(res => (
          <div key={res.id} className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-amber-800 text-sm">{res.id.substring(0, 4).toUpperCase()}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500 capitalize">{res.menu_date}</span>
                </div>
                <p className="font-semibold text-gray-900">{res.name}</p>
                <div className="flex flex-col sm:flex-row gap-x-4 gap-y-0.5 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{res.email}</span>
                  {res.phone && <span>📞 {res.phone}</span>}
                  <span className="font-semibold">{res.portions} ración{res.portions > 1 ? 'es' : ''}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 italic truncate max-w-md">{res.menu_description}</p>
              </div>
              <div className="flex items-center gap-2 self-start">
                <button
                  onClick={() => handleApprove(res.id)}
                  disabled={actionLoading === res.id}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Aprobar
                </button>
                <button
                  onClick={() => handleReject(res.id)}
                  disabled={actionLoading === res.id}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
