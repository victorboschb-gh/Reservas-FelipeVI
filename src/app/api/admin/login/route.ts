import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
  normalizeUsername,
  safeEqual,
  sessionCookieOptions,
  verifyAgainstDummy,
  verifyPassword,
} from '@/lib/auth';

const FAILURE_DELAY_MS = 500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function invalid() {
  await delay(FAILURE_DELAY_MS);
  return NextResponse.json({ success: false, error: 'Credenciales inválidas' }, { status: 401 });
}

/**
 * Bootstrap: solo cuando admin_users está vacía se aceptan ADMIN_USERNAME /
 * ADMIN_PASSWORD de las variables de entorno, y en ese momento se crea el
 * usuario con la contraseña hasheada. Después las env ya no dan acceso.
 */
async function tryBootstrap(username: string, password: string): Promise<string | null> {
  const countRows = (await sql`SELECT COUNT(*)::int AS n FROM admin_users`) as { n: number }[];
  if ((countRows[0]?.n ?? 0) > 0) return null;

  const envUser = normalizeUsername(process.env.ADMIN_USERNAME);
  const envPass = process.env.ADMIN_PASSWORD ?? '';
  if (!envUser || !envPass) {
    console.error('admin_users está vacía y ADMIN_USERNAME/ADMIN_PASSWORD no están definidas: no hay forma de acceder.');
    return null;
  }

  const userOk = safeEqual(username, envUser);
  const passOk = safeEqual(password, envPass);
  if (!userOk || !passOk) return null;

  const passwordHash = await hashPassword(password);
  // La condición NOT EXISTS evita crear un segundo usuario por bootstrap en carreras.
  const inserted = (await sql`
    INSERT INTO admin_users (username, password_hash)
    SELECT ${envUser}, ${passwordHash}
    WHERE NOT EXISTS (SELECT 1 FROM admin_users)
    ON CONFLICT (username) DO NOTHING
    RETURNING id
  `) as { id: string }[];
  if (inserted[0]) {
    console.info(`Usuario admin inicial "${envUser}" creado por bootstrap.`);
    return inserted[0].id;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalid();
    }
    const { username: rawUsername, password } = (body ?? {}) as { username?: unknown; password?: unknown };
    const username = normalizeUsername(rawUsername);
    if (!username || typeof password !== 'string' || !password || password.length > 200) {
      return invalid();
    }

    let userId: string | null = null;

    const rows = (await sql`
      SELECT id, password_hash FROM admin_users
      WHERE username = ${username} AND active = true
      LIMIT 1
    `) as { id: string; password_hash: string }[];

    if (rows[0]) {
      if (await verifyPassword(password, rows[0].password_hash)) {
        userId = rows[0].id;
      }
    } else {
      userId = await tryBootstrap(username, password);
      if (!userId) await verifyAgainstDummy(password);
    }

    if (!userId) return invalid();

    const token = await createSession(userId);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    // Elimina la cookie antigua del sistema anterior, si existiera.
    response.cookies.set('admin_token', '', sessionCookieOptions(0));
    return response;
  } catch (error) {
    console.error('Error en login admin:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
