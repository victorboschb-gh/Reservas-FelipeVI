import { NextResponse } from 'next/server';
import { sql, Reservation, expireOldReservations } from '@/lib/db';
import { sendRejectionEmail } from '@/lib/email';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.redirect(new URL('/confirmar?status=error', request.url));
  }

  try {
    await expireOldReservations();

    const rows = await sql`
      SELECT r.*, md.date as menu_date, md.description as menu_description
      FROM reservations r
      JOIN menu_days md ON r.menu_day_id = md.id
      WHERE r.confirmation_token = ${token}
      LIMIT 1
    ` as (Reservation & { menu_date: string; menu_description: string })[];

    if (rows.length === 0) {
      return NextResponse.redirect(new URL('/confirmar?status=not_found', request.url));
    }

    const reservation = rows[0];

    if (reservation.status === 'confirmed') {
      return NextResponse.redirect(new URL(`/confirmar?status=already_confirmed&name=${encodeURIComponent(reservation.name)}`, request.url));
    }

    if (reservation.status === 'expired') {
      return NextResponse.redirect(new URL('/confirmar?status=expired', request.url));
    }

    if (reservation.status === 'rejected') {
      return NextResponse.redirect(new URL('/confirmar?status=rejected', request.url));
    }

    if (reservation.status !== 'pending_confirmation') {
      return NextResponse.redirect(new URL('/confirmar?status=error', request.url));
    }

    const confirmedReservations = await sql`
      SELECT COALESCE(SUM(portions), 0) as total
      FROM reservations
      WHERE menu_day_id = ${reservation.menu_day_id}
      AND status = 'confirmed'
    ` as { total: number }[];

    const menuDayRows = await sql`
      SELECT max_portions FROM menu_days WHERE id = ${reservation.menu_day_id}
    ` as { max_portions: number }[];

    const totalConfirmed = Number(confirmedReservations[0]?.total || 0);
    const maxPortions = Number(menuDayRows[0]?.max_portions || 0);
    const available = maxPortions - totalConfirmed;

    if (reservation.portions > available) {
      await sql`
        UPDATE reservations SET status = 'rejected' WHERE id = ${reservation.id}
      `;

      const dateString = format(new Date(reservation.menu_date), "eeee, d 'de' MMMM 'de' yyyy", { locale: es });
      try {
        await sendRejectionEmail(
          reservation.email,
          reservation.name,
          dateString,
          'No quedan comidas disponibles para ese día.'
        );
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
      }

      return NextResponse.redirect(new URL('/confirmar?status=no_capacity', request.url));
    }

    await sql`
      UPDATE reservations
      SET status = 'confirmed', confirmed_at = NOW()
      WHERE id = ${reservation.id}
    `;

    return NextResponse.redirect(new URL(`/confirmar?status=success&name=${encodeURIComponent(reservation.name)}`, request.url));
  } catch (error) {
    console.error("Error confirming reservation:", error);
    return NextResponse.redirect(new URL('/confirmar?status=error', request.url));
  }
}
