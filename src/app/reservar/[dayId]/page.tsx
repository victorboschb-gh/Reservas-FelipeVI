import { sql, MenuDay, isEmailBlacklisted, isEmailVerified, expireOldReservations } from '@/lib/db';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { ArrowLeft, ChefHat } from 'lucide-react';
import { redirect } from 'next/navigation';
import { ALLERGENS } from '@/lib/constants';
import { sendConfirmationEmail } from '@/lib/email';

async function getDayAndAvailability(dayId: string) {
  try {
    await expireOldReservations();

    const dayRows = await sql`
      SELECT * FROM menu_days WHERE id = ${dayId} LIMIT 1
    ` as MenuDay[];
    
    if (dayRows.length === 0) return null;
    const dayData = dayRows[0];

    const reservations = await sql`
      SELECT portions FROM reservations WHERE menu_day_id = ${dayId} AND status = 'confirmed'
    ` as { portions: number }[];

    const totalReserved = reservations.reduce((acc, curr) => acc + curr.portions, 0);
    const availablePortions = dayData.max_portions - totalReserved;

    return { day: dayData, availablePortions };
  } catch (error) {
    console.error("Error fetching day info:", error);
    return null;
  }
}

export default async function ReservationFormPage({ params, searchParams }: { params: Promise<{ dayId: string }>; searchParams?: Promise<{ error?: string }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error;
  const data = await getDayAndAvailability(resolvedParams.dayId);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-800">Día no encontrado</h2>
        <Link href="/" className="text-sky-500 hover:underline mt-4">Ver calendario</Link>
      </div>
    );
  }

  const { day, availablePortions } = data;

  if (availablePortions <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-800">Aforo completado</h2>
        <p className="text-gray-500 mt-2">Lo sentimos, no quedan comidas disponibles para este día.</p>
        <Link href="/" className="text-sky-500 hover:underline mt-6 bg-sky-50 px-6 py-2 rounded-full">Volver al calendario</Link>
      </div>
    );
  }

  async function createReservation(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const portions = parseInt(formData.get('portions') as string);
    const dayId = formData.get('menu_day_id') as string;
    const allergens = formData.getAll('allergens') as string[];
    const allergens_notes = formData.get('allergens_notes') as string | null;

    const currentData = await getDayAndAvailability(dayId);
    if (!currentData || currentData.availablePortions < portions) {
      redirect(`/reservar/${dayId}?error=No+hay+suficientes+comidas+disponibles`);
    }

    if (name && email && phone && portions) {
      const blacklisted = await isEmailBlacklisted(email);
      if (blacklisted) {
        redirect(`/reservar/${dayId}?error=No+puedes+realizar+reservas+con+este+email`);
      }

      const verified = await isEmailVerified(email);
      const status = verified ? 'pending_confirmation' as const : 'pending_approval' as const;

      const result = await sql`
        INSERT INTO reservations (menu_day_id, name, email, phone, portions, allergens, allergens_notes, status)
        VALUES (${dayId}, ${name}, ${email}, ${phone}, ${portions}, ${allergens}, ${allergens_notes}, ${status})
        RETURNING id, confirmation_token, status
      ` as { id: string; confirmation_token: string; status: string }[];
      
      const resId = result[0]?.id;
      const token = result[0]?.confirmation_token;
      const resStatus = result[0]?.status;

      if (resId && resStatus === 'pending_confirmation' && token) {
        const dateString = format(new Date(day.date), "eeee, d 'de' MMMM 'de' yyyy", { locale: es });
        try {
          await sendConfirmationEmail(email, name, token, dateString, portions);
        } catch (emailError) {
          console.error("Error sending confirmation email:", emailError);
        }
        redirect(`/reservar/exito?resId=${resId}&sent=true`);
      } else if (resId && resStatus === 'pending_approval') {
        redirect(`/reservar/pendiente?resId=${resId}`);
      } else {
        redirect(`/?success=true`);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-800 mb-8 font-medium">
          <ArrowLeft className="w-4 h-4" />
          Volver a comidas
        </Link>
        
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden transform transition-all">
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-8 text-white relative flex justify-between items-start md:items-center">
            <div className="relative z-10">
              <h1 className="text-3xl font-extrabold mb-2 drop-shadow-md">Reserva de Comida</h1>
              <p className="text-sky-100 text-xl capitalize font-medium">{format(new Date(day.date), "eeee, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
            </div>
            <img src="/Logo_CIFP.png" alt="CIFP Felipe VI" className="h-16 w-auto bg-white/95 backdrop-blur-sm p-2 rounded-xl shadow-md hidden sm:block relative z-10" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mt-20 -mr-20 blur-2xl pointer-events-none"></div>
          </div>
          
          <div className="p-8">
            {errorMessage && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm font-medium">
                {decodeURIComponent(errorMessage)}
              </div>
            )}
            <div className="mb-10 p-5 bg-gradient-to-br from-sky-50 to-blue-50 text-sky-950 rounded-2xl border border-sky-100 shadow-sm flex gap-4 items-start">
              <ChefHat className="w-6 h-6 mt-0.5 flex-shrink-0 text-sky-500 drop-shadow-sm" />
              <div className="w-full">
                <strong className="block mb-2 font-bold text-sky-900 text-lg">Comida del día</strong>
                <p className="text-gray-700 leading-relaxed">{day.description}</p>
                
                {day.allergens && day.allergens.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 self-center mr-1">Alérgenos:</span>
                    {day.allergens.map(aId => {
                      const a = ALLERGENS.find(al => al.id === aId);
                      if (!a) return null;
                      return (
                        <span key={a.id} className={`text-[11px] px-2 py-0.5 rounded border ${a.color} font-bold uppercase tracking-wider`}>
                          {a.label}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-sky-200/50 flex items-center justify-between">
                  <div className="text-sm font-semibold text-sky-700 bg-white/60 backdrop-blur-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Quedan {availablePortions} comidas
                  </div>
                </div>
              </div>
            </div>

            <form action={createReservation} className="space-y-6">
              <input type="hidden" name="menu_day_id" value={day.id} />
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre y Apellidos</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="Ej: Laura López"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all placeholder-gray-500 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
                  <input 
                    type="email" 
                    name="email" 
                    required 
                    placeholder="laura@ejemplo.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all placeholder-gray-500 text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-400">La primera vez que reserves con un email, un administrador deberá aprobar tu reserva.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    required 
                    placeholder="Ej: 600123456"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all placeholder-gray-500 text-gray-900"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">¿Tienes alguna alergia o intolerancia?</label>
                <p className="text-xs text-gray-500 mb-4">Marca los alérgenos que te afectan para que cocina pueda adaptar tu ración si es posible.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                  {ALLERGENS.map(allergen => (
                    <label key={allergen.id} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        name="allergens" 
                        value={allergen.id}
                        className="w-4 h-4 text-sky-600 rounded border-gray-300 focus:ring-sky-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{allergen.label}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Otros detalles o notas (opcional)</label>
                  <input 
                    type="text" 
                    name="allergens_notes" 
                    placeholder="Ej: Soy celíaco severo, Sin sal, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all placeholder-gray-400 text-sm text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Comidas</label>
                <select 
                  name="portions" 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none bg-white appearance-none cursor-pointer transition-all text-gray-900"
                >
                  {Array.from({ length: Math.min(10, availablePortions) }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-gray-500">Máximo 10 comidas por reserva.</p>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg text-lg transform hover:-translate-y-0.5"
                >
                  Confirmar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
