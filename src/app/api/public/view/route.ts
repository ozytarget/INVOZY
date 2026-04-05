import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const shareId = String(body?.shareId || '');

    if (!shareId || !UUID_REGEX.test(shareId)) {
      return NextResponse.json({ error: 'Invalid shareId' }, { status: 400 });
    }

    // Find the owner of this document
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
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const row = rows[0];
    const docs = Array.isArray(row.documents_json) ? row.documents_json : [];
    const doc = docs.find((d: any) => d?.share_token === shareId) as any;

    if (!doc) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const notifications = Array.isArray(row.notifications_json) ? [...row.notifications_json] : [];

    // Avoid duplicate view notifications within 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentView = notifications.find(
      (n: any) => n.documentId === doc.id && n.event === 'viewed' &&
        new Date(n.timestamp).getTime() > fiveMinutesAgo
    );

    if (recentView) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const clientName = doc.clientName || 'Client';
    const newNotification = {
      id: crypto.randomUUID(),
      userId: row.user_id,
      event: 'viewed',
      message: `Client viewed ${doc.type} ${clientName}`,
      documentId: doc.id,
      documentType: doc.type,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    notifications.unshift(newNotification);

    await dbQuery(
      `UPDATE app_state SET notifications_json = $1, updated_at = now() WHERE user_id = $2`,
      [JSON.stringify(notifications), row.user_id]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in /api/public/view:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
