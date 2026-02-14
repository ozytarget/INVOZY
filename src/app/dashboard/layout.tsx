'use client';

import { ProtectedRoute } from '@/components/protected-route';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { LogoIcon } from '@/components/logo';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Estimados', href: '/dashboard/estimates', icon: '📋' },
  { label: 'Invoices', href: '/dashboard/invoices', icon: '📄' },
  { label: 'Clientes', href: '/dashboard/clients', icon: '👥' },
  { label: 'Pagos', href: '/dashboard/payments', icon: '💳' },
  { label: 'Settings', href: '/dashboard/manage', icon: '⚙️' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-slate-50">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-3">
              <LogoIcon />
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <button className="text-slate-600 hover:text-slate-900">🔍</button>
              <button className="text-slate-600 hover:text-slate-900">🔔</button>
              <button
                onClick={handleSignOut}
                className="text-slate-600 text-sm hover:text-slate-900"
              >
                Salir
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Desktop Only */}
          <div className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col">
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-3 px-4 py-2.5 rounded-lg hover:bg-slate-100 text-slate-700 text-sm font-medium transition duration-200"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleSignOut}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto pb-20 lg:pb-0">
            {children}
          </div>
        </div>

        {/* Bottom Navigation - Mobile Only */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center justify-around">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center py-3 text-slate-400 hover:text-white hover:bg-slate-800 transition duration-200"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}