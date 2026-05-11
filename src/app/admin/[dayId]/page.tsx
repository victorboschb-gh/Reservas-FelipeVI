import { sql, MenuDay, Reservation } from '@/lib/db';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { ArrowLeft, Users, Check, X, Pencil, Mail, Clock, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';
import ExportButton from '@/app/components/ExportButton';
import { redirect } from 'next/navigation';
import DayReservationActions from '@/app/components/DayReservationActions';

export const dynamic = 'force-dynamic';

async function getDayData(dayId: string) {
  try {
    const dayPromise = sql`SELECT * FROM menu_days WHERE id = ${dayId} LIMIT 1` as unknown as Promise<MenuDay[]>;
    const resPromise = sql`SELECT * FROM reservations WHERE menu_day_id = ${dayId} ORDER BY created_at ASC` as unknown as Promise<Reservation[]>;
    
    const [dayRows, reservationsRows] = await Promise.all([dayPromise, resPromise]);

    return {
      day: dayRows.length > 0 ? dayRows[0] : null,
      reservations: reservationsRows,
    };
  } catch (error) {
    console.error("Error fetching day data:", error);
    return { day: null, reservations: [] };
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold border border-green-200">
          <ShieldCheck className="w-3 h-3" /> Confirmada
        </span>
      );
    case 'pending_confirmation':
      return (
        <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full text-xs font-bold border border-sky-200">
          <Mail className="w-3 h-3" /> Esperando email
        </span>
      );
    case 'pending_approval':
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold border border-amber-200">
          <Clock className="w-3 h-3" /> Pendiente aprobar
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold border border-red-200">
          <XCircle className="w-3 h-3" /> Rechazada
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold border border-gray-200">
          <AlertTriangle className="w-3 h-3" /> Expirada
        </span>
      );
    default:
      return <span className="text-xs text-gray-400">{status}</span>;
  }
}

export default async function AdminDayView({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ dayId: string }>;
  searchParams?: Promise<{ editRes?: string; editMenu?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const editResId = resolvedSearchParams?.editRes;
  const editMenu = resolvedSearchParams?.editMenu;
  const { day, reservations } = await getDayData(resolvedParams.dayId);

  if (!day) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800">Día no encontrado</h2>
        <Link href="/admin" className="text-sky-500 hover:underline mt-4 inline-block">
          Volver al panel
        </Link>
      </div>
    );
  }

  async function updateMenuDescription(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const description = formData.get('description') as string;
    const max_portions = parseInt(formData.get('max_portions') as string);

    if (id && description && max_portions) {
      try {
        await sql`
          UPDATE menu_days SET description = ${description}, max_portions = ${max_portions}
          WHERE id = ${id}
        `;
      } catch (error) {
        console.error("Error updating menu:", error);
      }
    }
    redirect(`/admin/${id}`);
  }

  async function updateReservation(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const portions = parseInt(formData.get('portions') as string);
    const dayId = formData.get('dayId') as string;

    if (id && name && email && phone && portions) {
      try {
        await sql`
          UPDATE reservations SET name = ${name}, email = ${email}, phone = ${phone}, portions = ${portions}
          WHERE id = ${id}
        `;
      } catch (error) {
        console.error("Error updating reservation:", error);
      }
    }
    redirect(`/admin/${dayId}`);
  }

  const dateString = format(new Date(day.date), "eeee, d 'de' MMMM", { locale: es });
  const confirmedReservations = reservations.filter(r => r.status === 'confirmed');
  const totalConfirmed = confirmedReservations.reduce((sum, r) => sum + r.portions, 0);
  const pendingReservations = reservations.filter(r => r.status === 'pending_approval' || r.status === 'pending_confirmation');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sky-500 hover:text-sky-800 flex items-center gap-2 mb-4 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Volver a Días
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 capitalize">{dateString}</h1>
              {!editMenu && (
                <Link href={`/admin/${day.id}?editMenu=true`} className="text-amber-500 hover:text-amber-700 bg-amber-50 p-1.5 rounded-md transition-colors" title="Editar Comida">
                  <Pencil className="w-4 h-4" />
                </Link>
              )}
            </div>
            {editMenu ? (
              <form action={updateMenuDescription} className="mt-3 space-y-3 bg-amber-50 p-4 rounded-xl border border-amber-200">
                <input type="hidden" name="id" value={day.id} />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción de la comida</label>
                  <textarea name="description" rows={3} defaultValue={day.description} required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Comidas disponibles</label>
                  <input type="number" name="max_portions" defaultValue={day.max_portions} min="1" required className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-gray-900" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Guardar
                  </button>
                  <Link href={`/admin/${day.id}`} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </Link>
                </div>
              </form>
            ) : (
              <p className="text-gray-600 mt-1">{day.description}</p>
            )}
          </div>
          <ExportButton 
            reservations={confirmedReservations} 
            dateString={format(new Date(day.date), "yyyy-MM-dd")} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Confirmadas</p>
            <p className="text-2xl font-bold text-gray-900">{totalConfirmed} <span className="text-lg font-normal text-gray-500">/ {day.max_portions}</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-lg">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-gray-900">{pendingReservations.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-sky-100 p-3 rounded-lg">
            <Users className="w-6 h-6 text-sky-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total reservas</p>
            <p className="text-2xl font-bold text-gray-900">{reservations.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {reservations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aún no hay reservas para este día.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cód.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rac.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alérgenos / Notas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((res) => {
                  const isEditing = editResId === res.id;

                  if (isEditing) {
                    return (
                      <tr key={res.id} className="bg-amber-50/50">
                        <td className="px-6 py-3 text-sm font-bold text-gray-700">{res.id.substring(0,4).toUpperCase()}</td>
                        <td colSpan={6} className="py-3 px-2">
                          <form action={updateReservation} className="flex flex-col sm:flex-row items-center gap-2" id={`edit-form-${res.id}`}>
                            <input type="hidden" name="id" value={res.id} />
                            <input type="hidden" name="dayId" value={day.id} />
                            <input type="text" name="name" defaultValue={res.name} required className="w-full sm:flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-gray-900" placeholder="Nombre" />
                            <input type="email" name="email" defaultValue={res.email} required className="w-full sm:flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-gray-900" placeholder="Email" />
                            <input type="tel" name="phone" defaultValue={res.phone} required className="w-full sm:flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-gray-900" placeholder="Teléfono" />
                            <input type="number" name="portions" defaultValue={res.portions} min="1" required className="w-full sm:w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-gray-900" />
                          </form>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button type="submit" form={`edit-form-${res.id}`} className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded-md transition-colors" title="Guardar">
                              <Check className="w-4 h-4" />
                            </button>
                            <Link href={`/admin/${day.id}`} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-1.5 rounded-md transition-colors" title="Cancelar">
                              <X className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={res.id} className={`hover:bg-gray-50 ${res.status === 'pending_approval' ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                        {res.id.substring(0,4).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {res.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex flex-col">
                          <span>{res.email}</span>
                          {res.phone && <span>{res.phone}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                        {res.portions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={res.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={res.allergens?.join(', ')}>
                        {res.allergens && res.allergens.length > 0 ? (
                           <div className="flex flex-wrap gap-1">
                             {res.allergens.map((a: string) => <span key={a} className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">{a}</span>)}
                           </div>
                        ) : (
                          <span className="text-gray-400 italic">Ninguno</span>
                        )}
                        {res.allergens_notes && <div className="mt-1 text-xs text-gray-500 truncate">{res.allergens_notes}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(res.created_at).toLocaleString('es-ES', { 
                          hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' 
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <DayReservationActions
                          reservationId={res.id}
                          dayId={day.id}
                          status={res.status}
                          editHref={`/admin/${day.id}?editRes=${res.id}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
