import { NextResponse } from 'next/server';
import { sql, Reservation, expireOldReservations } from '@/lib/db';
import { sendConfirmationEmail } from '@/lib/email';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function POST(request: Request) {
  try {
    const { reservationId } = await request.json();
    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 });
    }

    await expireOldReservations();

    const rows = await sql`
      SELECT r.*, md.date as menu_date, md.description as menu_description
      FROM reservations r
      JOIN menu_days md ON r.menu_day_id = md.id
      WHERE r.id = ${reservationId}
      LIMIT 1
    ` as (Reservation & { menu_date: string; menu_description: string })[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const reservation = rows[0];

    if (reservation.status !== 'pending_approval') {
      return NextResponse.json({ error: `Reservation status is '${reservation.status}', expected 'pending_approval'` }, { status: 400 });
    }

    await sql`
      INSERT INTO verified_emails (email) VALUES (${reservation.email.toLowerCase()})
      ON CONFLICT (email) DO NOTHING
    `;

    await sql`
      UPDATE reservations SET status = 'pending_confirmation' WHERE id = ${reservationId}
    `;

    const dateString = format(new Date(reservation.menu_date), "eeee, d 'de' MMMM 'de' yyyy", { locale: es });

    try {
      await sendConfirmationEmail(
        reservation.email,
        reservation.name,
        reservation.confirmation_token!,
        dateString,
        reservation.portions
      );
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      return NextResponse.json({ error: 'Reservation approved but email failed to send' }, { status: 207 });
    }

    return NextResponse.json({ success: true, message: 'Reservation approved and confirmation email sent' });
  } catch (error) {
    console.error("Error approving reservation:", error);
    return NextResponse.json({ error: 'Error approving reservation' }, { status: 500 });
  }
}
