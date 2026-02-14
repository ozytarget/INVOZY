'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getEstimates } from '@/lib/estimates-service';
import { getInvoices } from '@/lib/invoices-service';
import type { Estimate } from '@/lib/estimates-service';
import type { Invoice } from '@/lib/invoices-service';

export default function DashboardPage() {
  const { user } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [est, inv] = await Promise.all([
        getEstimates(user.id),
        getInvoices(user.id),
      ]);
      setEstimates(est);
      setInvoices(inv);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = invoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const pendingEstimates = estimates.filter(e => e.status === 'Draft').length;
  const pendingInvoices = invoices.filter(i => i.status !== 'Paid').length;

  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Bienvenido, {user?.email}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Ingresos Totales</p>
          <p className="text-3xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Estimados Pendientes</p>
          <p className="text-3xl font-bold text-blue-600">{pendingEstimates}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Invoices Pendientes</p>
          <p className="text-3xl font-bold text-orange-600">{pendingInvoices}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total de Documentos</p>
          <p className="text-3xl font-bold text-purple-600">{estimates.length + invoices.length}</p>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Estimates */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Estimados Recientes</h2>
          {estimates.slice(0, 5).length === 0 ? (
            <p className="text-gray-500">No hay estimados</p>
          ) : (
            <ul className="space-y-3">
              {estimates.slice(0, 5).map(est => (
                <li key={est.id} className="flex justify-between text-sm border-b pb-2">
                  <div>
                    <p className="font-semibold">{est.estimate_number}</p>
                    <p className="text-gray-600">{est.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${est.amount}</p>
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                      {est.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Invoices Recientes</h2>
          {invoices.slice(0, 5).length === 0 ? (
            <p className="text-gray-500">No hay invoices</p>
          ) : (
            <ul className="space-y-3">
              {invoices.slice(0, 5).map(inv => (
                <li key={inv.id} className="flex justify-between text-sm border-b pb-2">
                  <div>
                    <p className="font-semibold">{inv.invoice_number}</p>
                    <p className="text-gray-600">{inv.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${inv.amount}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      inv.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      inv.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
