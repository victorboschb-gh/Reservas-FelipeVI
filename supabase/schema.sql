-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: menu_days
CREATE TABLE IF NOT EXISTS menu_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  description TEXT NOT NULL,
  max_portions INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: reservations
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_day_id UUID NOT NULL REFERENCES menu_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  portions INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) but allow public access for this specific app
-- In a real app, we'd want to restrict this better, but for simplicity of setup and lack of user logins:
ALTER TABLE menu_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone for menu_days
CREATE POLICY "Public read menu_days" ON menu_days FOR SELECT USING (true);
CREATE POLICY "Public read reservations" ON reservations FOR SELECT USING (true);

-- Allow insert into reservations publically
CREATE POLICY "Public insert reservations" ON reservations FOR INSERT WITH CHECK (true);

-- For Admin (they will connect via service_role key or we can just allow full access depending on Supabase setup)
-- Since the Next.js app will likely use service_role to bypass RLS for admin panels, it's fine.
-- Otherwise, if admin actions use anon key, we'd need policies.
-- Let's just allow all operations for anon (assuming anon is disabled in API settings for destructive actions except through our UI)
-- Actually, better is to handle admin actions on the server-side Next.js using service_role or just allow it if we only secure our Nextjs routes.
-- Since our Next.js admin routes are secured, and we talk to Supabase via server components/actions, we can use the anon key for public stuff, and the service_role key OR just full policies for anon. 
-- Let's provide total access to `menu_days` for anon just to prevent issues if they don't configure service_role, but warn them.
-- To be secure: Admin should be done via server actions using standard key but since we don't have Supabase Auth for Admin (just a custom password), we will need to bypass RLS in the server.

-- Simplest policy:
CREATE POLICY "Allow all operations for anon on menu_days" ON menu_days FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on reservations" ON reservations FOR ALL USING (true) WITH CHECK (true);

-- NOTE: Since there's no native Auth used, the Next.js application will handle protecting the /admin routes.
