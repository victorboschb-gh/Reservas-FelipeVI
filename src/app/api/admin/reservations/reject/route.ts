import { NextResponse } from 'next/server';
import { sql, Reservation, expireOldReservations } from '@/lib/db';
import { sendAdminRejectionEmail } from '@/lib/email';
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
      SELECT r.*, md.date as menu_date
      FROM reservations r
      JOIN menu_days md ON r.menu_day_id = md.id
      WHERE r.id = ${reservationId}
      LIMIT 1
    ` as (Reservation & { menu_date: string })[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const reservation = rows[0];

    if (reservation.status !== 'pending_approval' && reservation.status !== 'pending_confirmation') {
      return NextResponse.json({ error: `Cannot reject reservation with status '${reservation.status}'` }, { status: 400 });
    }

    await sql`
      UPDATE reservations SET status = 'rejected' WHERE id = ${reservationId}
    `;

    const dateString = format(new Date(reservation.menu_date), "eeee, d 'de' MMMM 'de' yyyy", { locale: es });

    try {
      await sendAdminRejectionEmail(
        reservation.email,
        reservation.name,
        dateString
      );
    } catch (emailError) {
      console.error("Error sending rejection email:", emailError);
    }

    return NextResponse.json({ success: true, message: 'Reservation rejected' });
  } catch (error) {
    console.error("Error rejecting reservation:", error);
    return NextResponse.json({ error: 'Error rejecting reservation' }, { status: 500 });
  }
}
