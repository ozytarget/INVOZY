import { NextResponse } from 'next/server';
import { dbQuery, syncNormalizedNotifications } from '@/lib/server-db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Simple in-memory rate limiter (per-process, reset on deploy)
const viewAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
// Per-document ceiling, independent of the client-supplied IP so that rotating a
// spoofed X-Forwarded-For cannot lift the limit. Generous enough for many real
// viewers of the same public link within a minute.
const MAX_SHARE_ATTEMPTS = 60;
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_TRACKED_KEYS = 10000;

// Notification hygiene
const VIEWED_DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_STORED_NOTIFICATIONS = 200;

function isRateLimited(key: string, maxAttempts: number): boolean {
  const now = Date.now();
  if (viewAttempts.size >= MAX_TRACKED_KEYS) {
    // Drop expired entries so the map cannot grow without bound
    for (const [trackedKey, tracked] of viewAttempts) {
      if (now > tracked.resetAt) viewAttempts.delete(trackedKey);
    }
  }
  const entry = viewAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    viewAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > maxAttempts;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const shareId = String(body?.shareId || '');

    if (!shareId || !UUID_REGEX.test(shareId)) {
      return NextResponse.json({ error: 'Invalid shareId' }, { status: 400 });
    }

    // Rate limit by IP + shareId, and by shareId alone. The IP comes from a
    // client-controllable header (X-Forwarded-For) so it can be rotated to dodge
    // the per-IP bucket; the per-shareId ceiling bounds abuse regardless.
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
    if (
      isRateLimited(`${ip}:${shareId}`, MAX_ATTEMPTS) ||
      isRateLimited(`share:${shareId}`, MAX_SHARE_ATTEMPTS)
    ) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
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

    // Skip duplicate 'viewed' notifications for the same document within the last hour
    const now = Date.now();
    const hasRecentViewNotification = notifications.some((n: any) => {
      if (n?.event !== 'viewed' || n?.documentId !== doc.id) return false;
      const timestamp = Date.parse(String(n?.timestamp || ''));
      return Number.isFinite(timestamp) && now - timestamp < VIEWED_DEDUP_WINDOW_MS;
    });
    if (hasRecentViewNotification) {
      return NextResponse.json({ ok: true });
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
    // Keep only the most recent notifications (newest live at the front)
    const trimmedNotifications = notifications.slice(0, MAX_STORED_NOTIFICATIONS);

    await dbQuery(
      `UPDATE app_state SET notifications_json = $1, updated_at = now() WHERE user_id = $2`,
      [JSON.stringify(trimmedNotifications), row.user_id]
    );
    await syncNormalizedNotifications(row.user_id, trimmedNotifications);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in /api/public/view:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
