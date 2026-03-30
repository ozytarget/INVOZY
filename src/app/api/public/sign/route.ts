import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/supabase/client';

const generateShareToken = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const shareId = String(body?.shareId || '');
    const signature = String(body?.signature || '');

    if (!shareId || !signature) {
      return NextResponse.json({ error: 'Missing shareId or signature' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { data: estimateData, error: estimateError } = await (admin
      .from('estimates') as any)
      .select('*')
      .eq('share_token', shareId)
      .single();

    if (!estimateError && estimateData) {
      const estimate = estimateData;

      const { error: updateEstimateError } = await (admin
        .from('estimates') as any)
        .update({ signature, is_signed: true, status: 'Approved' })
        .eq('id', estimate.id);

      if (updateEstimateError) {
        return NextResponse.json({ error: updateEstimateError.message }, { status: 500 });
      }

      const { data: invoiceRows } = await (admin
        .from('invoices') as any)
        .select('id')
        .eq('user_id', estimate.user_id);

      const invoiceNumber = `INV-${String((invoiceRows || []).length + 1).padStart(3, '0')}`;

      const invoicePayload: Record<string, any> = {
        user_id: estimate.user_id,
        type: 'Invoice',
        status: 'Sent',
        share_token: generateShareToken(),
        company_name: estimate.company_name,
        company_address: estimate.company_address,
        company_email: estimate.company_email,
        company_phone: estimate.company_phone,
        company_logo: estimate.company_logo,
        company_website: estimate.company_website,
        contractor_name: estimate.contractor_name,
        scheduling_url: estimate.scheduling_url,
        client_name: estimate.client_name,
        client_email: estimate.client_email,
        client_address: estimate.client_address,
        client_phone: estimate.client_phone,
        project_title: estimate.project_title,
        issued_date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        amount: estimate.amount,
        tax_rate: estimate.tax_rate,
        notes: estimate.notes,
        terms: estimate.terms || 'Net 30',
        tax_id: estimate.tax_id,
        signature,
        is_signed: true,
        invoice_number: invoiceNumber,
        project_photos: estimate.project_photos || [],
        search_field: `${estimate.client_name} ${estimate.project_title} ${invoiceNumber}`.toLowerCase(),
      };

      if (estimate.line_items !== undefined) {
        invoicePayload.line_items = estimate.line_items;
      }

      const { data: createdInvoice, error: createInvoiceError } = await (admin
        .from('invoices') as any)
        .insert([invoicePayload])
        .select('id')
        .single();

      if (createInvoiceError) {
        return NextResponse.json({ error: createInvoiceError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, type: 'estimate', invoiceId: createdInvoice?.id });
    }

    const { data: invoiceData, error: invoiceError } = await (admin
      .from('invoices') as any)
      .select('id')
      .eq('share_token', shareId)
      .single();

    if (!invoiceError && invoiceData) {
      const { error: updateInvoiceError } = await (admin
        .from('invoices') as any)
        .update({ signature, is_signed: true, status: 'Sent' })
        .eq('id', invoiceData.id);

      if (updateInvoiceError) {
        return NextResponse.json({ error: updateInvoiceError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, type: 'invoice' });
    }

    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
