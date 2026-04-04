import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

const generateShareToken = (): string => {
  return crypto.randomUUID();
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SIGNATURE_LENGTH = 50000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const shareId = String(body?.shareId || '');
    const signature = String(body?.signature || '');

    if (!shareId || !signature) {
      return NextResponse.json({ error: 'Missing shareId or signature' }, { status: 400 });
    }

    // Validate input formats
    if (!UUID_REGEX.test(shareId)) {
      return NextResponse.json({ error: 'Invalid shareId format' }, { status: 400 });
    }
    if (signature.length > MAX_SIGNATURE_LENGTH) {
      return NextResponse.json({ error: 'Signature too large' }, { status: 400 });
    }

    const { rows } = await dbQuery<{ user_id: string; documents_json: any[]; notifications_json: any[] }>(
      `
        SELECT user_id, documents_json, notifications_json
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

    // Validate document can be signed
    if (original.isSigned) {
      return NextResponse.json({ error: 'Document already signed' }, { status: 409 });
    }
    if (original.status === 'Cancelled' || original.status === 'Rejected') {
      return NextResponse.json({ error: 'Document cannot be signed in current status' }, { status: 400 });
    }

    const notifications = Array.isArray(row.notifications_json) ? [...row.notifications_json] : [];
    const docNumber = original.type === 'Estimate' ? original.estimateNumber : original.invoiceNumber;
    const signedNotification = {
      id: crypto.randomUUID(),
      userId: row.user_id,
      event: 'signed',
      message: `Client signed ${original.type} ${docNumber || original.id}`,
      documentId: original.id,
      documentType: original.type,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    notifications.unshift(signedNotification);

    if (original.type === 'Estimate') {
      // Remove the estimate entirely — the invoice replaces it
      docs.splice(idx, 1);

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

      // Update notification to point to the new invoice
      notifications[0].documentId = newInvoiceId;
      notifications[0].documentType = 'Invoice';
      notifications[0].message = `Client signed Estimate ${docNumber || original.id} → Invoice ${invoiceNumber} created`;

      await dbQuery(
        'UPDATE app_state SET documents_json = $1::jsonb, notifications_json = $2::jsonb, updated_at = now() WHERE user_id = $3',
        [JSON.stringify(docs), JSON.stringify(notifications), row.user_id]
      );

      return NextResponse.json({ success: true, type: 'estimate', invoiceId: newInvoiceId });
    }

    docs[idx] = {
      ...original,
      signature,
      isSigned: true,
      status: 'Approved',
    };

    await dbQuery(
      'UPDATE app_state SET documents_json = $1::jsonb, notifications_json = $2::jsonb, updated_at = now() WHERE user_id = $3',
      [JSON.stringify(docs), JSON.stringify(notifications), row.user_id]
    );

    return NextResponse.json({ success: true, type: 'invoice' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
