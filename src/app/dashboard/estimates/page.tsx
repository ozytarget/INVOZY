'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { getEstimates, deleteEstimate } from '@/lib/estimates-service';
import type { Estimate } from '@/lib/estimates-service';
import Link from 'next/link';

export default function EstimatesPage() {
  const { user } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadEstimates();
  }, [user]);

  const loadEstimates = async () => {
    if (!user) return;
    try {
      const data = await getEstimates(user.id);
      setEstimates(data);
    } catch (err) {
      console.error('Error loading estimates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar estimado?')) return;
    try {
      await deleteEstimate(id);
      setEstimates(estimates.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting estimate:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Signed':
        return { bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', text: 'Firmado' };
      case 'Sent':
        return { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', text: 'Enviado' };
      case 'Viewed':
        return { bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', text: 'Visto' };
      case 'Declined':
        return { bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', text: 'Rechazado' };
      default:
        return { bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-700', text: 'Borrador' };
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Estimados</h1>
        <p className="text-slate-600">Gestiona y envía tus estimados de proyectos</p>
      </div>

      {/* Create Button */}
      <div className="mb-6">
        <Link
          href="/dashboard/estimates/create"
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
        >
          + Nuevo Estimado
        </Link>
      </div>

      {/* Estimates Grid */}
      {estimates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-slate-600 text-lg mb-4">No tienes estimados aún</p>
          <Link
            href="/dashboard/estimates/create"
            className="inline-flex px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Crear tu primer estimado
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {estimates.map(est => {
            const statusColor = getStatusColor(est.status);
            return (
              <div
                key={est.id}
                className={`${statusColor.bg} border border-slate-200 rounded-lg p-6 hover:shadow-md transition duration-200`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{est.client_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor.badge}`}>
                        {statusColor.text}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mb-3">{est.project_title}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>📅 {new Date(est.issued_date).toLocaleDateString('es-ES')}</span>
                      <span>📌 {est.estimate_number}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900 mb-3">
                      ${est.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="space-x-2">
                      <Link
                        href={`/dashboard/estimates/${est.id}`}
                        className="inline-px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition duration-200"
                      >
                        Ver
                      </Link>
                      <button
                        onClick={() => handleDelete(est.id)}
                        className="inline-px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded transition duration-200"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
