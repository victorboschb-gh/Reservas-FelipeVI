import Link from 'next/link';
import { Clock, Mail, ArrowLeft } from 'lucide-react';
import { sql, Reservation, MenuDay } from '@/lib/db';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function PendingApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ resId?: string }>;
}) {
  const params = await searchParams;
  const resId = params.resId;

  let reservation: Reservation | null = null;
  let menuDay: MenuDay | null = null;
  let shortCode = '';

  if (resId) {
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
        shortCode = reservation.id.substring(0, 4).toUpperCase();
      }
    } catch (error) {
      console.error("Error fetching pending reservation:", error);
    }
  }

  const dateString = menuDay 
    ? format(new Date(menuDay.date), "eeee, d 'de' MMMM 'de' yyyy", { locale: es })
    : '';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex flex-col items-center justify-center font-sans relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-200 rounded-full blur-[100px] opacity-40 pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-200 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 text-amber-500 rounded-full mb-4 shadow-inner">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reserva Recibida</h1>
          <p className="text-gray-500 mt-2">Tu reserva está pendiente de aprobación por la administración.</p>
        </div>

        {reservation && menuDay && (
          <div className="bg-white rounded-3xl shadow-xl border border-amber-100 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white text-center relative border-b-4 border-dashed border-amber-200">
              <h2 className="text-2xl font-black tracking-widest uppercase mb-1 drop-shadow-sm">{shortCode}</h2>
              <p className="text-amber-100 text-sm font-medium uppercase tracking-wider">Código de Referencia</p>
              <div className="absolute bottom-[-10px] left-[-10px] w-5 h-5 bg-gray-50 rounded-full shadow-inner border border-gray-100"></div>
              <div className="absolute bottom-[-10px] right-[-10px] w-5 h-5 bg-gray-50 rounded-full shadow-inner border border-gray-100"></div>
            </div>

            <div className="p-8 space-y-5">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">A nombre de</p>
                <p className="font-bold text-gray-800 text-lg">{reservation.name}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Día de la comida</p>
                <p className="font-bold text-gray-800 capitalize">{dateString}</p>
              </div>

              <div className="flex justify-between items-end border-t border-gray-100 pt-5">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Comidas</p>
                  <p className="font-black text-2xl text-gray-900">{reservation.portions}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Estado</p>
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-bold border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    Pendiente de aprobación
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">¿Qué pasa ahora?</p>
                    <p className="text-sm text-amber-700 mt-1">Un administrador revisará tu reserva. Una vez aprobada, recibirás un email con un enlace para confirmarla definitivamente.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!reservation && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8 text-center">
            <p className="text-gray-600">No se encontró la reserva.</p>
          </div>
        )}

        <Link 
          href="/"
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white py-3.5 rounded-2xl shadow-md transition-all font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al Calendario
        </Link>
      </div>
    </div>
  );
}
