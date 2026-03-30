import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

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

    const { rows } = await dbQuery<{ user_id: string; documents_json: any[] }>(
      `
        SELECT user_id, documents_json
        FROM app_state
        WHERE EXISTS (
          SELECT 1
          FROM jsonb_array_elements(documents_json) AS doc
          WHERE doc->>'share_token' = $1
        )
        LIMIT 1
      `,
      [shareId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const row = rows[0];
    const docs = Array.isArray(row.documents_json) ? [...row.documents_json] : [];
    const idx = docs.findIndex((doc: any) => doc?.share_token === shareId);

    if (idx < 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const original = docs[idx] as any;

    if (original.type === 'Estimate') {
      const approvedEstimate = {
        ...original,
        signature,
        isSigned: true,
        status: 'Approved',
      };
      docs[idx] = approvedEstimate;

      const invoiceCount = docs.filter((doc: any) => doc?.type === 'Invoice').length;
      const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(3, '0')}`;
      const newInvoiceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `invoice-${Date.now()}`;

      const newInvoice = {
        ...original,
        id: newInvoiceId,
        type: 'Invoice',
        status: 'Sent',
        signature,
        isSigned: true,
        share_token: generateShareToken(),
        invoiceNumber,
        estimateNumber: undefined,
        issuedDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        search_field: `${original.clientName || ''} ${original.projectTitle || ''} ${invoiceNumber}`.toLowerCase(),
      };

      docs.push(newInvoice);

      await dbQuery(
        'UPDATE app_state SET documents_json = $1::jsonb, updated_at = now() WHERE user_id = $2',
        [JSON.stringify(docs), row.user_id]
      );

      return NextResponse.json({ success: true, type: 'estimate', invoiceId: newInvoiceId });
    }

    docs[idx] = {
      ...original,
      signature,
      isSigned: true,
      status: 'Sent',
    };

    await dbQuery(
      'UPDATE app_state SET documents_json = $1::jsonb, updated_at = now() WHERE user_id = $2',
      [JSON.stringify(docs), row.user_id]
    );

    return NextResponse.json({ success: true, type: 'invoice' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
