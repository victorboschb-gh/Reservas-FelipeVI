import { AlertTriangle } from 'lucide-react';

export default function AllergyNotice({ className = '' }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex gap-4 items-start bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 shadow-sm ${className}`}
    >
      <AlertTriangle className="w-7 h-7 flex-shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
      <div>
        <p className="font-bold text-amber-900 text-lg mb-1">Aviso sobre alergias e intolerancias</p>
        <p className="text-amber-900 text-base leading-relaxed">
          No podemos garantizar la ausencia de contaminación cruzada. Si tienes alguna alergia o intolerancia alimentaria, consúltalo con el personal antes de reservar.
        </p>
      </div>
    </div>
  );
}
