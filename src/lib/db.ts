
export type MenuDay = {
  id: string;
  date: string;
  description: string;
  max_portions: number;
  allergens?: string[] | null;
  created_at: string;
};

export type ReservationStatus = 'pending_confirmation' | 'pending_approval' | 'confirmed' | 'rejected' | 'expired';

export type Reservation = {
  id: string;
  menu_day_id: string;
  name: string;
  email: string;
  phone: string;
  portions: number;
  allergens?: string[] | null;
  allergens_notes?: string | null;
  status: ReservationStatus;
  confirmation_token: string | null;
  confirmed_at: string | null;
  created_at: string;
};

export type BlacklistedEmail = {
  id: string;
  email: string;
  created_at: string;
};

export type VerifiedEmail = {
  id: string;
  email: string;
  created_at: string;
};

import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.warn("Neon database credentials not found. Database queries will return empty results.");
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://dummy:dummy@dummy.tech/dummy';

export const sql = process.env.DATABASE_URL || process.env.POSTGRES_URL 
  ? neon(url)
  : (async () => []) as unknown as ReturnType<typeof neon>;

export async function isEmailBlacklisted(email: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM blacklisted_emails WHERE email = ${email.toLowerCase()} LIMIT 1` as Record<string, unknown>[];
  return rows.length > 0;
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM verified_emails WHERE email = ${email.toLowerCase()} LIMIT 1` as Record<string, unknown>[];
  return rows.length > 0;
}

export async function expireOldReservations(): Promise<void> {
  try {
    await sql`
      UPDATE reservations
      SET status = 'expired'
      WHERE status IN ('pending_confirmation', 'pending_approval')
      AND created_at < NOW() - INTERVAL '24 hours'
    `;
  } catch (error) {
    console.error("Error expiring old reservations:", error);
  }
}
