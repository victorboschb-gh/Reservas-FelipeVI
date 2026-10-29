import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { KeyRound, UserPlus, Users } from 'lucide-react';
import { sql } from '@/lib/db';
import {
  MIN_PASSWORD_LENGTH,
  deleteUserSessions,
  getCurrentAdmin,
  hashPassword,
  isValidUsername,
  normalizeUsername,
  validatePassword,
  verifyPassword,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BASE = '/admin/usuarios';

const OK_MESSAGES: Record<string, string> = {
  password_changed: 'Contraseña cambiada. Se han cerrado tus demás sesiones.',
  user_created: 'Usuario creado correctamente.',
  user_deactivated: 'Usuario desactivado y sesiones cerradas.',
  user_activated: 'Usuario reactivado.',
  password_reset: 'Contraseña restablecida y sesiones del usuario cerradas.',
};

const ERROR_MESSAGES: Record<string, string> = {
  password_short: `La contraseña debe tener entre ${MIN_PASSWORD_LENGTH} y 200 caracteres.`,
  password_mismatch: 'Las contraseñas nuevas no coinciden.',
  wrong_current: 'La contraseña actual no es correcta.',
  same_password: 'La nueva contraseña debe ser distinta de la actual.',
  invalid_username: 'Usuario no válido: 3-32 caracteres, solo letras minúsculas, números, punto, guion y guion bajo.',
  user_exists: 'Ya existe un usuario con ese nombre.',
  self_deactivate: 'No puedes desactivar tu propio usuario.',
  last_active: 'Debe quedar al menos un usuario activo.',
  self_reset: 'Para cambiar tu propia contraseña usa "Cambiar mi contraseña".',
  not_found: 'Usuario no encontrado.',
  server: 'Error interno. Inténtalo de nuevo.',
};

type AdminUserRow = {
  id: string;
  username: string;
  active: boolean;
  created_at: string;
};

function done(kind: 'ok' | 'error', code: string): never {
  redirect(`${BASE}?${kind}=${code}`);
}

async function requireAdmin() {
  const me = await getCurrentAdmin();
  if (!me) redirect('/admin/login');
  return me;
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// Server actions (cada una re-valida la sesión)
// ---------------------------------------------------------------------------

async function changeMyPassword(formData: FormData) {
  'use server';
  const me = await requireAdmin();
  const current = str(formData, 'current_password');
  const next = str(formData, 'new_password');
  const repeat = str(formData, 'repeat_password');

  if (validatePassword(next)) done('error', 'password_short');
  if (next !== repeat) done('error', 'password_mismatch');
  if (next === current) done('error', 'same_password');

  let code = 'server';
  try {
    const rows = (await sql`SELECT password_hash FROM admin_users WHERE id = ${me.id} LIMIT 1`) as { password_hash: string }[];
    if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) {
      code = 'wrong_current';
    } else {
      const hash = await hashPassword(next);
      await sql`UPDATE admin_users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${me.id}`;
      await deleteUserSessions(me.id, me.tokenHash);
      code = 'password_changed';
    }
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
  }
  if (code === 'password_changed') done('ok', code);
  done('error', code);
}

async function createUser(formData: FormData) {
  'use server';
  await requireAdmin();
  const username = normalizeUsername(str(formData, 'username'));
  const password = str(formData, 'password');

  if (!isValidUsername(username)) done('error', 'invalid_username');
  if (validatePassword(password)) done('error', 'password_short');

  let code = 'server';
  try {
    const hash = await hashPassword(password);
    const inserted = (await sql`
      INSERT INTO admin_users (username, password_hash)
      VALUES (${username}, ${hash})
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `) as { id: string }[];
    code = inserted[0] ? 'user_created' : 'user_exists';
  } catch (error) {
    console.error('Error creando usuario:', error);
  }
  revalidatePath(BASE);
  if (code === 'user_created') done('ok', code);
  done('error', code);
}

async function setUserActive(formData: FormData) {
  'use server';
  const me = await requireAdmin();
  const id = str(formData, 'id');
  const activate = str(formData, 'active') === 'true';

  if (!id) done('error', 'not_found');
  if (!activate && id === me.id) done('error', 'self_deactivate');

  let code = 'server';
  try {
    if (activate) {
      const rows = (await sql`
        UPDATE admin_users SET active = true, updated_at = NOW() WHERE id = ${id} RETURNING id
      `) as { id: string }[];
      code = rows[0] ? 'user_activated' : 'not_found';
    } else {
      // Solo desactiva si queda al menos otro usuario activo.
      const rows = (await sql`
        UPDATE admin_users SET active = false, updated_at = NOW()
        WHERE id = ${id}
          AND EXISTS (SELECT 1 FROM admin_users WHERE active = true AND id <> ${id})
        RETURNING id
      `) as { id: string }[];
      if (rows[0]) {
        await deleteUserSessions(id);
        code = 'user_deactivated';
      } else {
        const exists = (await sql`SELECT 1 FROM admin_users WHERE id = ${id}`) as unknown[];
        code = exists.length ? 'last_active' : 'not_found';
      }
    }
  } catch (error) {
    console.error('Error cambiando estado de usuario:', error);
  }
  revalidatePath(BASE);
  if (code === 'user_activated' || code === 'user_deactivated') done('ok', code);
  done('error', code);
}

async function resetUserPassword(formData: FormData) {
  'use server';
  const me = await requireAdmin();
  const id = str(formData, 'id');
  const password = str(formData, 'password');

  if (!id) done('error', 'not_found');
  if (id === me.id) done('error', 'self_reset');
  if (validatePassword(password)) done('error', 'password_short');

  let code = 'server';
  try {
    const hash = await hashPassword(password);
    const rows = (await sql`
      UPDATE admin_users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${id} RETURNING id
    `) as { id: string }[];
    if (rows[0]) {
      await deleteUserSessions(id);
      code = 'password_reset';
    } else {
      code = 'not_found';
    }
  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
  }
  if (code === 'password_reset') done('ok', code);
  done('error', code);
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 placeholder-gray-500 text-gray-900';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; error?: string }>;
}) {
  const me = await requireAdmin();
  const params = await searchParams;
  const okMsg = params?.ok ? OK_MESSAGES[params.ok] : undefined;
  const errorMsg = params?.error ? ERROR_MESSAGES[params.error] : undefined;

  let users: AdminUserRow[] = [];
  try {
    users = (await sql`
      SELECT id, username, active, created_at FROM admin_users ORDER BY username ASC
    `) as AdminUserRow[];
  } catch (error) {
    console.error('Error listando usuarios:', error);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Usuarios administradores</h1>
        <p className="text-gray-500 mt-1">Gestiona quién puede acceder al panel y cambia tu contraseña.</p>
      </div>

      {okMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">{okMsg}</div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{errorMsg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {/* Cambiar mi contraseña */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
              <KeyRound className="w-5 h-5 text-sky-500" />
              Cambiar mi contraseña
            </h2>
            <form action={changeMyPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
                <input type="password" name="current_password" required autoComplete="current-password" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                <input type="password" name="new_password" required minLength={MIN_PASSWORD_LENGTH} maxLength={200} autoComplete="new-password" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repetir nueva contraseña</label>
                <input type="password" name="repeat_password" required minLength={MIN_PASSWORD_LENGTH} maxLength={200} autoComplete="new-password" className={inputClass} />
              </div>
              <p className="text-xs text-gray-500">Mínimo {MIN_PASSWORD_LENGTH} caracteres. Se cerrarán tus otras sesiones abiertas.</p>
              <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2.5 rounded-lg transition-colors">
                Cambiar contraseña
              </button>
            </form>
          </div>

          {/* Crear usuario */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
              <UserPlus className="w-5 h-5 text-sky-500" />
              Nuevo usuario
            </h2>
            <form action={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input type="text" name="username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._\-]{3,32}" autoComplete="off" placeholder="ej: marta" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña inicial</label>
                <input type="password" name="password" required minLength={MIN_PASSWORD_LENGTH} maxLength={200} autoComplete="new-password" className={inputClass} />
              </div>
              <p className="text-xs text-gray-500">El usuario se guarda en minúsculas. Comunica la contraseña por un canal seguro y pide que la cambie al entrar.</p>
              <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2.5 rounded-lg transition-colors">
                Crear usuario
              </button>
            </form>
          </div>
        </div>

        {/* Listado */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                <Users className="w-5 h-5 text-sky-500" />
                Usuarios ({users.length})
              </h2>
            </div>
            {users.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No hay usuarios.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {users.map((u) => {
                  const isMe = u.id === me.id;
                  return (
                    <li key={u.id} className="p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {u.username}
                            {isMe && <span className="ml-2 text-xs font-medium text-sky-600">(tú)</span>}
                          </p>
                          <p className="text-xs text-gray-500">
                            Alta: {u.created_at ? format(new Date(u.created_at), "d 'de' MMMM 'de' yyyy", { locale: es }) : '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {u.active ? (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded">ACTIVO</span>
                          ) : (
                            <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded">DESACTIVADO</span>
                          )}
                          {!isMe && (
                            <form action={setUserActive}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="active" value={u.active ? 'false' : 'true'} />
                              <button
                                type="submit"
                                className={
                                  u.active
                                    ? 'text-sm text-red-600 hover:text-red-800 border border-red-200 bg-red-50 px-3 py-1 rounded-lg transition-colors'
                                    : 'text-sm text-green-700 hover:text-green-900 border border-green-200 bg-green-50 px-3 py-1 rounded-lg transition-colors'
                                }
                              >
                                {u.active ? 'Desactivar' : 'Reactivar'}
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                      {!isMe && (
                        <details className="group">
                          <summary className="text-sm text-sky-500 hover:text-sky-700 cursor-pointer list-none">
                            Restablecer contraseña
                          </summary>
                          <form action={resetUserPassword} className="mt-3 flex flex-col sm:flex-row gap-3">
                            <input type="hidden" name="id" value={u.id} />
                            <input
                              type="password"
                              name="password"
                              required
                              minLength={MIN_PASSWORD_LENGTH}
                              maxLength={200}
                              autoComplete="new-password"
                              placeholder={`Nueva contraseña (mín. ${MIN_PASSWORD_LENGTH})`}
                              className={inputClass}
                            />
                            <button type="submit" className="shrink-0 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                              Restablecer
                            </button>
                          </form>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
