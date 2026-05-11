'use client';

import { useState } from 'react';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import Link from 'next/link';

export default function DayReservationActions({
  reservationId,
  status,
  editHref,
}: {
  reservationId: string;
  dayId: string;
  status: string;
  editHref: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const reload = () => window.location.reload();

  const handleAction = async (action: 'approve' | 'reject' | 'delete', confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    setLoading(action);
    try {
      await fetch(`/api/admin/reservations/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      });
      reload();
    } catch {
      alert('Error al procesar la acción');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1 justify-end">
      {status === 'pending_approval' && (
        <button
          onClick={() => handleAction('approve', '¿Aprobar esta reserva? Se enviará un email de confirmación al usuario.')}
          disabled={!!loading}
          className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded-md transition-colors disabled:opacity-50"
          title="Aprobar reserva"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
      {(status === 'pending_approval' || status === 'pending_confirmation') && (
        <button
          onClick={() => handleAction('reject', '¿Rechazar esta reserva? Se notificará al usuario por email.')}
          disabled={!!loading}
          className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md transition-colors disabled:opacity-50"
          title="Rechazar reserva"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {status !== 'rejected' && status !== 'expired' && (
        <Link href={editHref} className="text-amber-500 hover:text-amber-700 bg-amber-50 p-1.5 rounded-md transition-colors" title="Editar Reserva">
          <Edit2 className="w-4 h-4" />
        </Link>
      )}
      <button
        onClick={() => handleAction('delete', '¿Eliminar esta reserva permanentemente?')}
        disabled={!!loading}
        className="text-red-400 hover:text-red-600 bg-red-50/50 p-1.5 rounded-md transition-colors disabled:opacity-50"
        title="Eliminar reserva"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
