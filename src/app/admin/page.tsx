import { sql, MenuDay } from '@/lib/db';
import { Plus, Trash2, Edit2, Check, X, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ALLERGENS } from '@/lib/constants';
import BlacklistedEmailsManager from '@/app/components/BlacklistedEmailsManager';
import PendingApprovals from '@/app/components/PendingApprovals';

export const dynamic = 'force-dynamic';

type MenuDayWithAvailability = MenuDay & { available_portions: number };

async function getMenuDays(showPast: boolean = false): Promise<MenuDayWithAvailability[]> {
  try {
    const rows = showPast
      ? await sql`
          SELECT md.*,
                 COALESCE(md.max_portions - (
                   SELECT SUM(r.portions) FROM reservations r 
                   WHERE r.menu_day_id = md.id AND r.status = 'confirmed'
                 ), md.max_portions) as available_portions
          FROM menu_days md ORDER BY date ASC
        ` as MenuDayWithAvailability[]
      : await sql`
          SELECT md.*,
                 COALESCE(md.max_portions - (
                   SELECT SUM(r.portions) FROM reservations r 
                   WHERE r.menu_day_id = md.id AND r.status = 'confirmed'
                 ), md.max_portions) as available_portions
          FROM menu_days md WHERE md.date >= CURRENT_DATE ORDER BY date ASC
        ` as MenuDayWithAvailability[];
    return rows;
  } catch (error) {
    console.error("Error fetching menu days:", error);
    return [];
  }
}

type PendingApproval = {
  id: string;
  name: string;
  email: string;
  phone: string;
  portions: number;
  created_at: string;
  menu_date: string;
  menu_description: string;
};

async function getPendingApprovals(): Promise<PendingApproval[]> {
  try {
    const rows = await sql`
      SELECT r.id, r.name, r.email, r.phone, r.portions, r.created_at,
             md.date as menu_date, md.description as menu_description,
             to_char(md.date, 'TMDay, TMDD "de" TMMonth "de" YYYY') as formatted_date
      FROM reservations r
      JOIN menu_days md ON r.menu_day_id = md.id
      WHERE r.status = 'pending_approval'
      ORDER BY r.created_at ASC
    ` as PendingApproval[];
    return rows.map((r) => ({
      ...r,
      menu_date: format(new Date(r.menu_date), "eeee, d 'de' MMMM", { locale: es }),
    }));
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return [];
  }
}

export default async function AdminDashboard({ searchParams }: { searchParams?: Promise<{ edit?: string; past?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const editId = resolvedSearchParams?.edit;
  const showPast = resolvedSearchParams?.past === 'true';
  const days = await getMenuDays(showPast);
  const pendingApprovals = await getPendingApprovals();

  async function createMenuDay(formData: FormData) {
    'use server';
    const date = formData.get('date') as string;
    const description = formData.get('description') as string;
    const max_portions = parseInt(formData.get('max_portions') as string);
    const allergens = formData.getAll('allergens') as string[];

    if (date && description && max_portions) {
      try {
        await sql`
          INSERT INTO menu_days (date, description, max_portions, allergens)
          VALUES (${date}, ${description}, ${max_portions}, ${allergens})
        `;
        revalidatePath('/admin');
      } catch (error) {
        console.error("Error creating menu day:", error);
      }
    }
  }

  async function updateMenuDay(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const date = formData.get('date') as string;
    const description = formData.get('description') as string;
    const max_portions = parseInt(formData.get('max_portions') as string);
    const allergens = formData.getAll('allergens') as string[];

    if (id && date && description && max_portions) {
      try {
        await sql`
          UPDATE menu_days 
          SET date = ${date}, description = ${description}, max_portions = ${max_portions}, allergens = ${allergens}
          WHERE id = ${id}
        `;
      } catch (error) {
        console.error("Error updating menu day:", error);
      }
    }
    redirect('/admin');
  }

  async function deleteMenuDay(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    if (id) {
      try {
        await sql`DELETE FROM menu_days WHERE id = ${id}`;
        revalidatePath('/admin');
      } catch (error) {
        console.error("Error deleting menu day:", error);
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-500 mt-1">Gestiona comidas, usuarios y reservas.</p>
        </div>
      </div>

      {/* Guía de funcionamiento */}
      <details className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group">
        <summary className="flex items-center gap-3 p-5 cursor-pointer hover:bg-gray-50 transition-colors list-none">
          <div className="bg-sky-100 p-2 rounded-lg">
            <HelpCircle className="w-5 h-5 text-sky-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">Guía de funcionamiento</h2>
            <p className="text-sm text-gray-500">Cómo funciona el sistema de reservas y validación</p>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </summary>
        <div className="px-5 pb-5 border-t border-gray-100 space-y-5">
          {/* Flujo de reserva */}
          <div className="mt-4">
            <h3 className="font-bold text-gray-800 mb-3">Flujo de una reserva</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
                <p className="text-sm font-semibold text-sky-800 mb-1">Usuario verificado</p>
                <p className="text-xs text-gray-600">Si el email del usuario ya fue verificado antes (aprobado por un admin), se le envía directamente el email de confirmación.</p>
                <p className="text-xs text-sky-600 mt-2 font-medium">Estado: pending_confirmation → confirmed</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <p className="text-sm font-semibold text-amber-800 mb-1">Primera vez</p>
                <p className="text-xs text-gray-600">La primera vez que un email reserva, queda pendiente de tu aprobación manual. Apruebala aquí y se enviará el email de confirmación al usuario. Su email quedará verificado para futuras reservas.</p>
                <p className="text-xs text-amber-600 mt-2 font-medium">Estado: pending_approval → pending_confirmation → confirmed</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <p className="text-sm font-semibold text-red-800 mb-1">Bloqueado o sin plazas</p>
                <p className="text-xs text-gray-600">Los emails en la lista negra no pueden reservar. Si al confirmar no quedan comidas, se rechaza automáticamente. Las reservas sin confirmar en 24h expiran solas.</p>
                <p className="text-xs text-red-600 mt-2 font-medium">Estado: rejected / expired</p>
              </div>
            </div>
          </div>

          {/* Secciones del panel */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">¿Qué gestionas desde aquí?</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded mt-0.5">PENDIENTES</span>
                <span>Reservas de usuarios no verificados que necesitan tu aprobación. Al aprobar, el email queda verificado para futuras reservas.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded mt-0.5">LISTA NEGRA</span>
                <span>Emails bloqueados que no pueden hacer reservas. Se les muestra un error al intentar reservar.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded mt-0.5">DÍAS DE COMIDA</span>
                <span>Crea, edita o elimina días. Define fecha, descripción, comidas disponibles y alérgenos. Desde cada día puedes ver las reservas, editarlas y exportar a Excel.</span>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-2 text-sm">Notas importantes</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>Solo las reservas en estado <strong>confirmed</strong> cuentan para las comidas disponibles que ven los usuarios.</li>
              <li>Al aprobar una reserva de un email nuevo, ese email queda guardado como verificado. La próxima vez que reserve con ese email, recibirá el email de confirmación directamente.</li>
              <li>Las reservas sin confirmar por email expiran automáticamente a las 24 horas.</li>
              <li>Los usuarios no pueden cancelar reservas. Si necesitan cambios, deben contactar al centro.</li>
            </ul>
          </div>
        </div>
      </details>

      {/* Pending Approvals Section */}
      <PendingApprovals reservations={pendingApprovals} />

      {/* Blacklisted Emails Section */}
      <BlacklistedEmailsManager />

      {/* Menu Days Section */}
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Días de Comida</h2>
        <Link
          href={showPast ? '/admin' : '/admin?past=true'}
          className="text-sm text-sky-500 hover:text-sky-700 border border-sky-200 bg-sky-50 px-3 py-1 rounded-lg transition-colors"
        >
          {showPast ? 'Ocultar pasados' : 'Mostrar pasados'}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
              <Plus className="w-5 h-5 text-sky-500" />
              Nuevo Día
            </h2>
            <form action={createMenuDay} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" name="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción de la Comida</label>
                <textarea name="description" rows={3} required placeholder="Ej: Macarrones con tomate y filete de pollo..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comidas Disponibles</label>
                <input type="number" name="max_portions" min="1" required placeholder="50" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500 text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alérgenos</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALLERGENS.map(a => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input type="checkbox" name="allergens" value={a.id} className="rounded text-sky-500 focus:ring-sky-500" />
                      <span className="truncate">{a.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 rounded-lg transition-colors">
                Publicar Comida
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {days.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay días de comida programados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/4">Comida</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Aforo Disponible</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {days.map((day) => {
                      const isEditing = editId === day.id;
                      if (isEditing) {
                        return (
                          <tr key={day.id} className="bg-sky-50/50">
                            <td colSpan={4} className="p-0">
                              <form action={updateMenuDay} className="flex flex-col sm:flex-row items-center gap-2 p-3">
                                <input type="hidden" name="id" value={day.id} />
                                <div className="flex flex-col gap-3 w-full sm:w-auto flex-1">
                                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                                    <input type="date" name="date" defaultValue={format(new Date(day.date), "yyyy-MM-dd")} required className="w-full sm:w-auto px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-gray-900" />
                                    <input type="text" name="description" defaultValue={day.description} required className="w-full flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-gray-900" />
                                    <input type="number" name="max_portions" defaultValue={day.max_portions} min="1" required className="w-full sm:w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-sky-500 focus:border-sky-500 text-gray-900" />
                                  </div>
                                  <div className="bg-white p-2 border border-gray-200 rounded text-xs flex flex-wrap gap-2">
                                    <span className="font-semibold text-gray-600 w-full mb-1">Alérgenos:</span>
                                    {ALLERGENS.map(a => (
                                      <label key={a.id} className="flex items-center gap-1 cursor-pointer">
                                        <input type="checkbox" name="allergens" value={a.id} defaultChecked={day.allergens?.includes(a.id)} className="rounded text-sky-500 h-3 w-3" />
                                        <span className="text-gray-600">{a.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-1 justify-end w-full sm:w-auto self-start sm:self-center mt-2 sm:mt-0">
                                  <button type="submit" className="text-green-600 hover:text-green-800 bg-green-50 p-1.5 rounded-md transition-colors" title="Guardar">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <Link href="/admin" className="text-gray-500 hover:text-gray-700 bg-gray-100 p-1.5 rounded-md transition-colors" title="Cancelar">
                                    <X className="w-4 h-4" />
                                  </Link>
                                </div>
                              </form>
                            </td>
                          </tr>
                        );
                      }
                      
                      return (
                        <tr key={day.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {format(new Date(day.date), "eeee, d 'de' MMMM", { locale: es })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs md:max-w-md lg:max-w-xs xl:max-w-sm">
                            <div className="flex flex-col gap-1">
                              <span>{day.description}</span>
                              {day.allergens && day.allergens.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {day.allergens.map(aId => {
                                    const a = ALLERGENS.find(al => al.id === aId);
                                    if (!a) return null;
                                    return <span key={a.id} className={`text-[10px] px-1.5 py-0.5 rounded border ${a.color} font-medium`}>{a.label}</span>
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`font-bold ${day.available_portions > 0 ? 'text-green-600' : 'text-red-500'}`}>{day.available_portions}</span>
                            <span className="text-gray-400"> / {day.max_portions}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                            <Link href={`/admin/${day.id}`} className="text-sky-600 hover:text-sky-900 bg-sky-50 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold">
                              Ver Reservas
                            </Link>
                            <Link href={`/admin?edit=${day.id}`} className="text-amber-500 hover:text-amber-700 bg-amber-50 p-1.5 rounded-md transition-colors" title="Editar Comida">
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            <form action={deleteMenuDay}>
                              <input type="hidden" name="id" value={day.id} />
                              <button type="submit" className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md transition-colors" title="Eliminar Día">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </form>
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
      </div>
    </div>
  );
}
