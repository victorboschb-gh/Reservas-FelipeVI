import Link from 'next/link';
import { CheckCircle, XCircle, AlertTriangle, Clock, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; name?: string }>;
}) {
  const params = await searchParams;
  const status = params.status;
  const name = params.name ? decodeURIComponent(params.name) : '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {status === 'success' && (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-500 rounded-full mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Reserva Confirmada</h1>
          {name && <p className="text-lg text-gray-600 mb-4">Hola <strong>{name}</strong>, tu reserva ha sido confirmada con éxito.</p>}
          <p className="text-gray-500 mb-8">Presenta tu código de recogida el día de la comida.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Volver al Inicio
          </Link>
        </div>
      )}

      {status === 'already_confirmed' && (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 text-sky-500 rounded-full mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Ya estaba confirmada</h1>
          {name && <p className="text-lg text-gray-600 mb-8">Hola <strong>{name}</strong>, esta reserva ya estaba confirmada anteriormente.</p>}
          <Link href="/" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Volver al Inicio
          </Link>
        </div>
      )}

      {status === 'no_capacity' && (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-500 rounded-full mb-6">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Sin plazas disponibles</h1>
          <p className="text-lg text-gray-600 mb-4">Lo sentimos, pero al confirmar tu reserva ya no quedaban comidas disponibles para ese día.</p>
          <p className="text-gray-500 mb-8">Te hemos enviado un email con los detalles.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Ver otros días
          </Link>
        </div>
      )}

      {status === 'expired' && (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 text-amber-500 rounded-full mb-6">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Enlace expirado</h1>
          <p className="text-lg text-gray-600 mb-8">El enlace de confirmación ha expirado (pasaron más de 24 horas). Tu reserva ha sido cancelada automáticamente.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Hacer una nueva reserva
          </Link>
        </div>
      )}

      {status === 'rejected' && (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-500 rounded-full mb-6">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Reserva rechazada</h1>
          <p className="text-lg text-gray-600 mb-8">Esta reserva ha sido rechazada por la administración.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Volver al Inicio
          </Link>
        </div>
      )}

      {status === 'not_found' && (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 text-gray-500 rounded-full mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Reserva no encontrada</h1>
          <p className="text-lg text-gray-600 mb-8">No hemos podido encontrar una reserva asociada a este enlace.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Volver al Inicio
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-500 rounded-full mb-6">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Error</h1>
          <p className="text-lg text-gray-600 mb-8">Ha ocurrido un error al procesar tu confirmación. Inténtalo de nuevo más tarde.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Volver al Inicio
          </Link>
        </div>
      )}

      {!status && (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 text-sky-500 rounded-full mb-6">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Confirmación de Reserva</h1>
          <p className="text-lg text-gray-600 mb-8">Usa el enlace enviado a tu correo para confirmar tu reserva.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Volver al Inicio
          </Link>
        </div>
      )}
    </div>
  );
}
