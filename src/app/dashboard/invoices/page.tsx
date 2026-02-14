'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getInvoices, deleteInvoice } from '@/lib/invoices-service';
import type { Invoice } from '@/lib/invoices-service';
import Link from 'next/link';

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadInvoices();
  }, [user]);

  const loadInvoices = async () => {
    if (!user) return;
    try {
      const data = await getInvoices(user.id);
      setInvoices(data);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar invoice?')) return;
    try {
      await deleteInvoice(id);
      setInvoices(invoices.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Link
          href="/dashboard/invoices/create"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
        >
          + Nueva Invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500 mb-4">No hay invoices aún</p>
          <Link
            href="/dashboard/invoices/create"
            className="text-green-600 hover:underline"
          >
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">Número</th>
                <th className="px-6 py-3 text-left">Cliente</th>
                <th className="px-6 py-3 text-left">Proyecto</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono">{inv.invoice_number}</td>
                  <td className="px-6 py-3">{inv.client_name}</td>
                  <td className="px-6 py-3">{inv.project_title}</td>
                  <td className="px-6 py-3 text-right font-semibold">${inv.amount}</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      inv.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      inv.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                      inv.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 space-x-2">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="text-green-600 hover:underline"
                    >
                      Ver
                    </Link>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
