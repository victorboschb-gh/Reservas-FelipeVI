import { NextResponse } from 'next/server';
import { sql, Reservation } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { reservationId } = await request.json();
    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
    }

    const rows = await sql`
      SELECT id FROM reservations WHERE id = ${reservationId} LIMIT 1
    ` as Reservation[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    await sql`DELETE FROM reservations WHERE id = ${reservationId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json({ error: 'Error deleting reservation' }, { status: 500 });
  }
}
