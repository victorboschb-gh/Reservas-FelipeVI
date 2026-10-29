import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = 'admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días
export const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 200;
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

// scrypt: N=2^15, r=8, p=1 (~32 MiB de memoria por hash)
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

export type AdminUser = {
  id: string;
  username: string;
  active: boolean;
};

// ---------------------------------------------------------------------------
// Contraseñas (scrypt)
// ---------------------------------------------------------------------------

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Formato: scrypt$N$r$p$saltBase64url$hashBase64url */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (![N, r, p].every((n) => Number.isInteger(n) && n > 0) || N > 1 << 20 || r > 32 || p > 16) return false;
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    if (salt.length === 0 || expected.length === 0) return false;
    const key = await scrypt(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: Math.max(SCRYPT_MAXMEM, 256 * N * r),
    });
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

// Hash ficticio para igualar tiempos cuando el usuario no existe.
let dummyHashPromise: Promise<string> | null = null;
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHashPromise ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(password, await dummyHashPromise);
}

/** Comparación en tiempo constante de cadenas arbitrarias. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

export function normalizeUsername(username: unknown): string {
  return typeof username === 'string' ? username.trim().toLowerCase() : '';
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

/** Devuelve un mensaje de error o null si la contraseña es aceptable. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Crea una sesión y devuelve el token en claro (solo va en la cookie). */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  // Limpieza oportunista de sesiones caducadas.
  try {
    await sql`DELETE FROM admin_sessions WHERE expires_at < NOW()`;
  } catch (error) {
    console.error('Error limpiando sesiones caducadas:', error);
  }
  await sql`
    INSERT INTO admin_sessions (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${userId}, NOW() + ${`${SESSION_MAX_AGE_SECONDS} seconds`}::interval)
  `;
  return token;
}

export async function getSessionUser(token: string | undefined | null): Promise<AdminUser | null> {
  if (!token || token.length > 200) return null;
  try {
    const rows = (await sql`
      SELECT u.id, u.username, u.active
      FROM admin_sessions s
      JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = ${hashToken(token)}
        AND s.expires_at > NOW()
        AND u.active = true
      LIMIT 1
    `) as AdminUser[];
    return rows[0] ?? null;
  } catch (error) {
    console.error('Error validando sesión:', error);
    return null;
  }
}

export async function deleteSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await sql`DELETE FROM admin_sessions WHERE token_hash = ${hashToken(token)}`;
}

export async function deleteUserSessions(userId: string, exceptTokenHash?: string): Promise<void> {
  if (exceptTokenHash) {
    await sql`DELETE FROM admin_sessions WHERE user_id = ${userId} AND token_hash <> ${exceptTokenHash}`;
  } else {
    await sql`DELETE FROM admin_sessions WHERE user_id = ${userId}`;
  }
}

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

// ---------------------------------------------------------------------------
// Helpers para Server Components / Server Actions
// ---------------------------------------------------------------------------

/** Usuario admin de la petición actual (lee la cookie) o null. */
export async function getCurrentAdmin(): Promise<(AdminUser & { tokenHash: string }) | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user || !token) return null;
  return { ...user, tokenHash: hashToken(token) };
}
