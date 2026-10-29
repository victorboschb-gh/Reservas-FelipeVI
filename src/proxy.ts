import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, getSessionUser } from '@/lib/auth';

// Next.js 16: `proxy.ts` sustituye a `middleware.ts` y se ejecuta SIEMPRE en
// runtime Node.js (no admite la opción `runtime`), por lo que puede usar
// node:crypto y el driver de Neon para validar la sesión contra la BD.

const PUBLIC_PATHS = new Set(['/admin/login', '/api/admin/login', '/api/admin/logout']);

function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

export async function proxy(request: NextRequest) {
  const path = normalizePath(request.nextUrl.pathname);
  const isApi = path.startsWith('/api/admin');
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (PUBLIC_PATHS.has(path)) {
    if (path === '/admin/login' && token && (await getSessionUser(token))) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  const user = await getSessionUser(token);
  if (!user) {
    if (isApi) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin', '/api/admin/:path*'],
};
