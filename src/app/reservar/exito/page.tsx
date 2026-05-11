import { sql, Reservation, MenuDay } from '@/lib/db';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { CheckCircle, ChefHat, Calendar as CalendarIcon, Mail, ArrowLeft, Clock } from 'lucide-react';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function ReservationSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ resId?: string; sent?: string }>;
}) {
  const resolvedParams = await searchParams;
  const resId = resolvedParams.resId;
  const emailSent = resolvedParams.sent === 'true';

  if (!resId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Reserva Recibida</h1>
        <p className="text-gray-600 mb-8">Tu ración ha sido registrada.</p>
        <Link href="/" className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  let reservation: Reservation | null = null;
  let menuDay: MenuDay | null = null;

  try {
    const resRows = await sql`
      SELECT * FROM reservations WHERE id = ${resId} LIMIT 1
    ` as Reservation[];
    
    if (resRows.length > 0) {
      reservation = resRows[0];
      const dayRows = await sql`
        SELECT * FROM menu_days WHERE id = ${reservation.menu_day_id} LIMIT 1
      ` as MenuDay[];
      if (dayRows.length > 0) {
        menuDay = dayRows[0];
      }
    }
  } catch (error) {
    console.error("Error fetching reservation ticket:", error);
  }

  if (!reservation || !menuDay) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Reserva no encontrada</h1>
        <Link href="/" className="text-sky-500 hover:underline">Volver al Inicio</Link>
      </div>
    );
  }

  const shortCode = reservation.id.substring(0, 4).toUpperCase();
  const dateString = format(new Date(menuDay.date), "eeee, d 'de' MMMM 'de' yyyy", { locale: es });
  const isConfirmed = reservation.status === 'confirmed';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex flex-col items-center justify-center font-sans relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-200 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[100px] opacity-40 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          {isConfirmed ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-500 rounded-full mb-4 shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reserva Confirmada</h1>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 text-sky-500 rounded-full mb-4 shadow-inner">
                <Mail className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Revisa tu correo</h1>
            </>
          )}
        </div>

        {!isConfirmed && emailSent && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-sky-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sky-900">Email de confirmación enviado</p>
                <p className="text-sm text-sky-700 mt-1">
                  Te hemos enviado un email a <strong>{reservation.email}</strong> con un enlace para confirmar tu reserva.
                  Tienes <strong>24 horas</strong> para confirmarla.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isConfirmed && !emailSent && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Reserva registrada</p>
                <p className="text-sm text-amber-700 mt-1">
                  Tu reserva ha sido registrada. Si requiere aprobación, recibirás un email cuando sea aprobada.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* The Ticket */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transform transition-all hover:scale-[1.01] hover:shadow-2xl">
          <div className={`${isConfirmed ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-sky-500 to-blue-600'} p-6 text-white text-center relative border-b-4 border-dashed border-sky-200`}>
            <h2 className="text-2xl font-black tracking-widest uppercase mb-1 drop-shadow-sm">{shortCode}</h2>
            <p className="text-sky-100 text-sm font-medium uppercase tracking-wider">Código de Recogida</p>
            <div className="absolute bottom-[-10px] left-[-10px] w-5 h-5 bg-gray-50 rounded-full shadow-inner border border-gray-100"></div>
            <div className="absolute bottom-[-10px] right-[-10px] w-5 h-5 bg-gray-50 rounded-full shadow-inner border border-gray-100"></div>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Día de la reserva</p>
              <div className="flex items-start gap-3 text-gray-800">
                <CalendarIcon className="w-5 h-5 text-sky-500 mt-0.5" />
                <p className="font-bold capitalize">{dateString}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">A nombre de</p>
              <p className="font-bold text-gray-800 text-lg">{reservation.name}</p>
            </div>

            <div className="flex justify-between items-end border-t border-gray-100 pt-6">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Comidas</p>
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-sky-500" />
                  <p className="font-black text-2xl text-gray-900">{reservation.portions}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Teléfono</p>
                <p className="font-bold text-gray-700">{reservation.phone || 'N/A'}</p>
              </div>
            </div>
            
            {(reservation.allergens && reservation.allergens.length > 0) && (
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 mt-4">
                <p className="text-xs text-orange-800 font-semibold uppercase tracking-wider mb-1">Aviso Cocina</p>
                <p className="text-sm text-orange-700 font-medium">Contiene indicaciones de alérgenos.</p>
              </div>
            )}

            {!isConfirmed && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Estado</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <p className="text-sm font-bold text-amber-700">Pendiente de confirmación por email</p>
                </div>
              </div>
            )}

            {isConfirmed && (
              <div className="bg-green-50 p-3 rounded-xl border border-green-200 mt-4">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Estado</p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-bold text-green-700">Confirmada</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {isConfirmed && <PrintButton />}
          
          <Link 
            href="/"
            className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white py-3.5 rounded-2xl shadow-md transition-all font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Calendario
          </Link>
        </div>
      </div>
    </div>
  );
}
