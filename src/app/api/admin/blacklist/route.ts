import { NextResponse } from 'next/server';
import { sql, BlacklistedEmail } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM blacklisted_emails ORDER BY email ASC` as BlacklistedEmail[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching blacklist:", error);
    return NextResponse.json({ error: 'Error fetching blacklist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || cleanEmail.includes(' ')) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM blacklisted_emails WHERE email = ${cleanEmail}` as { id: string }[];
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already in blacklist' }, { status: 409 });
    }

    const result = await sql`
      INSERT INTO blacklisted_emails (email) VALUES (${cleanEmail}) RETURNING *
    ` as BlacklistedEmail[];

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error adding to blacklist:", error);
    return NextResponse.json({ error: 'Error adding to blacklist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM blacklisted_emails WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from blacklist:", error);
    return NextResponse.json({ error: 'Error removing from blacklist' }, { status: 500 });
  }
}
