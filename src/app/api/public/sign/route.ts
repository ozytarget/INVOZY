import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import { withTransaction } from '@/lib/server-db';
import { nextDocumentNumber } from '@/lib/document-numbering';

const generateShareToken = (): string => {
  return crypto.randomUUID();
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SIGNATURE_LENGTH = 50000;

type SignOutcome =
  | { kind: 'not_found' }
  | { kind: 'already_signed' }
  | { kind: 'invalid_status' }
  | { kind: 'estimate'; invoiceId: string }
  | { kind: 'invoice' };

/**
 * Rewrites the normalized tables this route touches (documents, photos,
 * notifications) using the transaction client, so they commit atomically with
 * the app_state update and cannot drift on a partial failure.
 */
const syncNormalizedWithClient = async (
  client: PoolClient,
  userId: string,
  docs: unknown[],
  notifications: unknown[]
): Promise<void> => {
  await client.query('DELETE FROM app_document_photos WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM app_documents WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM app_notifications WHERE user_id = $1', [userId]);
  await client.query(
    `INSERT INTO app_documents (user_id, document_id, document_json, share_token)
     SELECT $1, d->>'id', d - 'projectPhotos', d->>'share_token'
     FROM jsonb_array_elements($2::jsonb) d
     WHERE d->>'id' IS NOT NULL
     ON CONFLICT (user_id, document_id) DO UPDATE SET
       document_json = EXCLUDED.document_json,
       share_token = EXCLUDED.share_token,
       updated_at = now()`,
    [userId, JSON.stringify(docs)]
  );
  await client.query(
    `INSERT INTO app_document_photos (user_id, document_id, photo_index, photo_json)
     SELECT $1, d->>'id', p.ordinality - 1, p.photo
     FROM jsonb_array_elements($2::jsonb) d
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE(d->'projectPhotos', '[]'::jsonb)) WITH ORDINALITY p(photo, ordinality)
     WHERE d->>'id' IS NOT NULL`,
    [userId, JSON.stringify(docs)]
  );
  await client.query(
    `INSERT INTO app_notifications (user_id, notification_id, notification_json)
     SELECT $1, COALESCE(NULLIF(n->>'id', ''), md5(n::text)), n
     FROM jsonb_array_elements($2::jsonb) n`,
    [userId, JSON.stringify(notifications)]
  );
};

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

    // The whole read-modify-write runs inside one transaction with the owner's
    // app_state row locked (SELECT ... FOR UPDATE), so a concurrent save by the
    // owner cannot overwrite the signature.
    const outcome = await withTransaction<SignOutcome>(async (client) => {
      const { rows } = await client.query<{ user_id: string; documents_json: any[]; notifications_json: any[] }>(
        `
          SELECT user_id, documents_json, notifications_json
          FROM app_state
          WHERE EXISTS (
            SELECT 1
            FROM jsonb_array_elements(documents_json) AS doc
            WHERE doc->>'share_token' = $1
          )
          LIMIT 1
          FOR UPDATE
        `,
        [shareId]
      );

      if (rows.length === 0) {
        return { kind: 'not_found' };
      }

      const row = rows[0];
      const docs = Array.isArray(row.documents_json) ? [...row.documents_json] : [];
      const idx = docs.findIndex((doc: any) => doc?.share_token === shareId);

      if (idx < 0) {
        return { kind: 'not_found' };
      }

      const original = docs[idx] as any;

      // Validate document can be signed
      if (original.isSigned) {
        return { kind: 'already_signed' };
      }
      if (original.status === 'Cancelled' || original.status === 'Rejected') {
        return { kind: 'invalid_status' };
      }

      const notifications = Array.isArray(row.notifications_json) ? [...row.notifications_json] : [];
      const clientName = original.clientName || 'Client';
      const signedNotification = {
        id: crypto.randomUUID(),
        userId: row.user_id,
        event: 'signed',
        message: `Client signed ${original.type} ${clientName}`,
        documentId: original.id,
        documentType: original.type,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      notifications.unshift(signedNotification);

      if (original.type === 'Estimate') {
        // Remove the estimate entirely — the invoice replaces it
        docs.splice(idx, 1);

        const invoiceNumber = nextDocumentNumber(docs, 'Invoice');
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
        notifications[0].message = `Client signed Estimate ${clientName} -> Invoice created`;

        await client.query(
          'UPDATE app_state SET documents_json = $1::jsonb, notifications_json = $2::jsonb, updated_at = now() WHERE user_id = $3',
          [JSON.stringify(docs), JSON.stringify(notifications), row.user_id]
        );
        await syncNormalizedWithClient(client, row.user_id, docs, notifications);

        return { kind: 'estimate', invoiceId: newInvoiceId };
      }

      docs[idx] = {
        ...original,
        signature,
        isSigned: true,
        status: 'Approved',
      };

      await client.query(
        'UPDATE app_state SET documents_json = $1::jsonb, notifications_json = $2::jsonb, updated_at = now() WHERE user_id = $3',
        [JSON.stringify(docs), JSON.stringify(notifications), row.user_id]
      );
      await syncNormalizedWithClient(client, row.user_id, docs, notifications);

      return { kind: 'invoice' };
    });

    if (outcome.kind === 'not_found') {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    if (outcome.kind === 'already_signed') {
      return NextResponse.json({ error: 'Document already signed' }, { status: 409 });
    }
    if (outcome.kind === 'invalid_status') {
      return NextResponse.json({ error: 'Document cannot be signed in current status' }, { status: 400 });
    }
    if (outcome.kind === 'estimate') {
      return NextResponse.json({ success: true, type: 'estimate', invoiceId: outcome.invoiceId });
    }
    return NextResponse.json({ success: true, type: 'invoice' });
  } catch (error) {
    console.error('Error in POST /api/public/sign:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
