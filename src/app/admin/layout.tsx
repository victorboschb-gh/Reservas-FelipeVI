import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change_me_in_production';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  const isAuthenticated = token?.value === ADMIN_SECRET;

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-sky-500 text-white shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-xl font-bold flex items-center gap-3">
                <img src="/Logo_CIFP.png" alt="Logo CIFP" className="h-10 w-auto bg-white rounded-md p-1 shadow-sm" />
                CIFP Felipe VI - Admin
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sky-100 hover:text-white transition-colors text-sm">
                Ver Web
              </Link>
              <form action={async () => {
                'use server';
                const cookieStore = await cookies();
                cookieStore.delete('admin_token');
                redirect('/admin/login');
              }}>
                <button type="submit" className="bg-sky-600 hover:bg-sky-900 px-4 py-2 rounded-lg text-sm transition-colors">
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
