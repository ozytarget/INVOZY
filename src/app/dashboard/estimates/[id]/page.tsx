'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getEstimate, updateEstimate } from '@/lib/estimates-service';
import { createInvoice } from '@/lib/invoices-service';
import type { Estimate } from '@/lib/estimates-service';

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    if (user && params.id) {
      loadEstimate();
    }
  }, [user, params.id]);

  const loadEstimate = async () => {
    try {
      const data = await getEstimate(params.id as string);
      if (data?.user_id !== user?.id) {
        router.push('/dashboard/estimates');
        return;
      }
      setEstimate(data);
    } catch (err) {
      console.error('Error loading estimate:', err);
      router.push('/dashboard/estimates');
    } finally {
      setLoading(false);
    }
  };

  const startSignature = () => {
    setIsSigning(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isSigning) return;

    let isDrawing = false;

    const startDrawing = (e: MouseEvent) => {
      isDrawing = true;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      ctx?.beginPath();
      ctx?.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e: MouseEvent) => {
      if (!isDrawing) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      ctx?.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx?.stroke();
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
    };
  }, [isSigning]);

  const handleSignEstimate = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !estimate) return;

    try {
      const signatureImage = canvas.toDataURL('image/png');
      
      // Update estimate with signature
      await updateEstimate(estimate.id, {
        signature: signatureImage,
        is_signed: true,
        status: 'Signed',
      });

      // Auto-create invoice
      await createInvoice(user!.id, {
        estimate_id: estimate.id,
        client_name: estimate.client_name,
        client_email: estimate.client_email,
        client_phone: estimate.client_phone,
        client_address: estimate.client_address,
        project_title: estimate.project_title,
        project_description: estimate.project_description,
        amount: estimate.amount,
        tax_rate: estimate.tax_rate,
        issued_date: new Date().toISOString(),
        due_date: estimate.due_date,
        notes: estimate.notes,
        terms: estimate.terms,
        line_items: estimate.line_items,
        status: 'Draft',
        company_name: estimate.company_name,
        company_email: estimate.company_email,
        company_phone: estimate.company_phone,
        company_address: estimate.company_address,
        company_logo: estimate.company_logo,
      });

      alert('Estimado firmado y invoice creada automáticamente!');
      router.push('/dashboard/estimates');
    } catch (err) {
      console.error('Error signing estimate:', err);
      alert('Error al firmar estimado');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  if (!estimate) return <div className="flex items-center justify-center min-h-screen">Estimado no encontrado</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold">{estimate.estimate_number}</h1>
            <p className="text-gray-600">{estimate.client_name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">${estimate.amount}</p>
            <p className="text-sm text-gray-600">+ Tax: ${(estimate.amount * estimate.tax_rate / 100).toFixed(2)}</p>
          </div>
        </div>

        {/* Company Info */}
        {estimate.company_logo && (
          <div className="mb-8">
            <img src={estimate.company_logo} alt="Company" className="h-12 object-contain" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold mb-2">De:</h3>
            <p className="font-semibold">{estimate.company_name}</p>
            <p>{estimate.company_email}</p>
            <p>{estimate.company_phone}</p>
            <p className="text-sm text-gray-600">{estimate.company_address}</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">Para:</h3>
            <p className="font-semibold">{estimate.client_name}</p>
            <p>{estimate.client_email}</p>
            <p>{estimate.client_phone}</p>
            <p className="text-sm text-gray-600">{estimate.client_address}</p>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div>
            <p className="text-gray-600">Proyecto</p>
            <p className="font-semibold">{estimate.project_title}</p>
          </div>
          <div>
            <p className="text-gray-600">Estado</p>
            <p className="font-semibold">{estimate.status}</p>
          </div>
          <div>
            <p className="text-gray-600">Fecha de Emisión</p>
            <p className="font-semibold">{new Date(estimate.issued_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Fecha de Vencimiento</p>
            <p className="font-semibold">{new Date(estimate.due_date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Signature Area */}
        {!estimate.is_signed ? (
          <div className="border-t pt-8">
            <h3 className="font-bold mb-4">Firmar Estimado</h3>
            {!isSigning ? (
              <button
                onClick={startSignature}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Comenzar a Firmar
              </button>
            ) : (
              <div>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair"
                />
                <div className="mt-4 space-x-2">
                  <button
                    onClick={handleSignEstimate}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                  >
                    Guardar Firma
                  </button>
                  <button
                    onClick={() => setIsSigning(false)}
                    className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t pt-8">
            <p className="text-green-600 font-semibold">✓ Estimado firmado y convertido a invoice</p>
            {estimate.signature && (
              <img src={estimate.signature} alt="Signature" className="mt-4 h-20 border rounded" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
