import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, deleteSession, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await deleteSession(request.cookies.get(SESSION_COOKIE)?.value);
  } catch (error) {
    console.error('Error cerrando sesión:', error);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return response;
}
