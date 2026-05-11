import { NextResponse } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change_me_in_production';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedUsername || !expectedPassword) {
      console.error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set.');
      return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }

    if (username === expectedUsername && password === expectedPassword) {
      const response = NextResponse.json({ success: true });
      
      response.cookies.set('admin_token', ADMIN_SECRET, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      
      return response;
    }

    return NextResponse.json({ success: false, error: 'Credenciales inválidas' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
