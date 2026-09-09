import { sql, MenuDay, expireOldReservations } from '@/lib/db';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Calendar as CalendarIcon, Users, CheckCircle, HelpCircle, ClipboardList, Mail, Clock, Download } from 'lucide-react';
import { ALLERGENS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

async function getAvailableDays() {
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  try {
    await expireOldReservations();
  } catch (error) {
    console.error("Error expiring old reservations:", error);
  }

  let daysData: MenuDay[] = [];
  try {
    const rows = await sql`
      SELECT * FROM menu_days 
      WHERE date >= ${todayStr}
      ORDER BY date ASC
    ` as MenuDay[];
    daysData = rows;
  } catch (error) {
    console.error("Error fetching menu days:", error);
    return [];
  }

  if (!daysData.length) return [];

  const dayIds = daysData.map(d => d.id);
  
  let reservations: { menu_day_id: string, portions: number }[] = [];
  try {
    if (dayIds.length > 0) {
      const rows = await sql`
        SELECT menu_day_id, portions FROM reservations
        WHERE menu_day_id = ANY(${dayIds as string[]})
        AND status = 'confirmed'
      ` as { menu_day_id: string, portions: number }[];
      reservations = rows;
    }
  } catch (error) {
    console.error("Error fetching reservations:", error);
  }

  const reservationsByDay = reservations.reduce((acc, curr) => {
    acc[curr.menu_day_id] = (acc[curr.menu_day_id] || 0) + curr.portions;
    return acc;
  }, {} as Record<string, number>);

  return daysData.map(day => ({
    ...day,
    availablePortions: day.max_portions - (reservationsByDay[day.id] || 0)
  }));
}

export default async function UserLandingPage() {
  const availableDays = await getAvailableDays();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white py-14 px-4 text-center shadow-inner relative overflow-hidden">
        <div className="max-w-3xl mx-auto flex flex-col items-center relative z-10">
          <div className="mb-6 bg-white/95 backdrop-blur-md p-5 rounded-[2rem] shadow-xl inline-block transform hover:scale-105 transition-transform duration-300">
            <img src="/Logo_CIFP.png" alt="Logo CIFP Felipe VI" className="h-20 md:h-24 w-auto object-contain" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-md">Comedor CIFP Felipe VI</h1>
          <p className="text-xl md:text-2xl text-sky-50 max-w-2xl mx-auto font-medium drop-shadow-sm">Reserva tus comidas.</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Guía rápida */}
        <details className="mb-12 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
          <summary className="flex items-center gap-3 p-6 cursor-pointer hover:bg-gray-50 transition-colors list-none">
            <div className="bg-sky-100 p-2.5 rounded-xl">
              <HelpCircle className="w-6 h-6 text-sky-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">¿Cómo funciona?</h2>
              <p className="text-sm text-gray-500">Guía rápida para reservar tu comida</p>
              <a href="/Guia_Practica_Automatizaciones_CIFP_v2 (1).pdf" download className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors">
                <Download className="w-4 h-4" />
                Descargar guía de la automatización
              </a>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-sky-50 rounded-xl p-5 border border-sky-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-sky-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <h3 className="font-bold text-gray-900">Elige tu comida</h3>
                </div>
                <p className="text-sm text-gray-600">Revisa las comidas disponibles. Cada día muestra el plato, los alérgenos y las comidas que quedan.</p>
              </div>
              <div className="bg-sky-50 rounded-xl p-5 border border-sky-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-sky-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <h3 className="font-bold text-gray-900">Rellena tus datos</h3>
                </div>
                <p className="text-sm text-gray-600">Nombre, email, teléfono y número de comidas. Puedes indicar alergias o intolerancias.</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-amber-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <h3 className="font-bold text-gray-900">Confirma por email</h3>
                </div>
                <p className="text-sm text-gray-600">Recibirás un email con un enlace de confirmación. Tienes <strong>24 horas</strong> para clicarlo. Si no lo haces, la reserva se cancela sola.</p>
              </div>
              <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <h3 className="font-bold text-gray-900">Recoge tu comida</h3>
                </div>
                <p className="text-sm text-gray-600">El día de la comida, presenta tu código de recogida (aparece al confirmar). ¡Y listo!</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-sky-400" /> La primera vez que reserves con un email, un administrador tendrá que aprobarte.</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-400" /> Las reservas sin confirmar expiran a las 24 horas.</span>
              <span className="flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-green-400" /> Solo las reservas confirmadas cuentan para el aforo.</span>
            </div>
          </div>
        </details>
        <div className="flex items-center gap-3 mb-8">
          <CalendarIcon className="w-8 h-8 text-sky-500" />
          <h2 className="text-3xl font-bold text-gray-800">Comidas</h2>
        </div>

        {availableDays.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-xl text-gray-600">Actualmente no hay comidas planificadas para los próximos días.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableDays.map(day => {
              const isAvailable = day.availablePortions > 0;
              
              return (
                <div key={day.id} className={`bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border flex flex-col ${isAvailable ? 'border-sky-100/60' : 'border-gray-200'} transform hover:-translate-y-1`}>
                  <div className={`p-5 ${isAvailable ? 'bg-gradient-to-r from-sky-50/80 to-white text-sky-950 border-b border-sky-100' : 'bg-gray-50 text-gray-500 border-b border-gray-200'}`}>
                    <h3 className="text-xl font-bold capitalize">
                      {format(new Date(day.date), "eeee, d 'de' MMMM", { locale: es })}
                    </h3>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <p className="text-gray-700 text-lg mb-4 leading-relaxed flex-grow">
                      {day.description}
                    </p>
                    
                    {day.allergens && day.allergens.length > 0 && (
                      <div className="mb-6 flex flex-wrap gap-1.5 align-baseline">
                        {day.allergens.map(aId => {
                          const a = ALLERGENS.find(al => al.id === aId);
                          if (!a) return null;
                          return (
                            <span key={a.id} className={`text-[11px] px-2 py-1 rounded-md border ${a.color} font-bold uppercase tracking-wider shadow-sm`}>
                              {a.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="mt-auto">
                      <div className="flex items-center gap-2 mb-6 text-sm font-medium">
                        <Users className="w-5 h-5 text-gray-400" />
                        {isAvailable ? (
                          <span className="text-sky-600 px-3 py-1.5 bg-sky-50 rounded-full font-semibold border border-sky-100">{day.availablePortions} comidas disponibles</span>
                        ) : (
                          <span className="text-red-500 px-3 py-1.5 bg-red-50 rounded-full font-semibold border border-red-100">Agotado</span>
                        )}
                      </div>
                      
                      {isAvailable ? (
                        <Link 
                          href={`/reservar/${day.id}`}
                          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all font-semibold text-lg"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Reservar Comida
                        </Link>
                      ) : (
                        <button disabled className="w-full bg-gray-100 text-gray-400 py-3.5 rounded-2xl font-semibold cursor-not-allowed">
                          Completado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="bg-gray-100 py-6 text-center border-t border-gray-200">
        <Link href="/admin/login" className="text-sky-500 hover:underline font-medium text-sm inline-block">Acceso Profesores</Link>
      </footer>
    </div>
  );
}
