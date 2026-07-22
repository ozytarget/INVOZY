import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbQuery, getNormalizedState } from '@/lib/server-db';
import { getAuthenticatedUser } from '@/lib/server-auth';

// Bounded but generous: existing accounts can hold large notification lists.
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_NOTIFICATIONS = 2000;

// Do not reject oversized lists (that would make mark-as-read silently fail for
// long-lived accounts and never persist); accept and trim to the ceiling below.
const putBodySchema = z
  .object({
    notifications: z.array(z.object({}).passthrough()).optional(),
  })
  .passthrough();

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await dbQuery<{ notifications_json: any[] }>(
      'SELECT notifications_json FROM app_state WHERE user_id = $1',
      [user.id]
    );

    const normalized = await getNormalizedState(user.id);
    const notifications = normalized.notifications.length > 0
      ? normalized.notifications
      : rows.length > 0 && Array.isArray(rows[0].notifications_json)
      ? rows[0].notifications_json
      : [];

    // Serve at most the same ceiling PUT persists. Legacy accounts with huge
    // lists self-heal: the client re-sends what it received, which now fits.
    return NextResponse.json({ notifications: notifications.slice(0, MAX_NOTIFICATIONS) });
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 400 });
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const validated = putBodySchema.safeParse(parsedBody);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Keep the most recent notifications; trimming an over-long list here lets
    // legacy accounts self-heal instead of being rejected.
    const notifications = (validated.data.notifications ?? []).slice(0, MAX_NOTIFICATIONS);

    await dbQuery(
      'UPDATE app_state SET notifications_json = $1::jsonb, updated_at = now() WHERE user_id = $2',
      [JSON.stringify(notifications), user.id]
    );
    try {
      await dbQuery('DELETE FROM app_notifications WHERE user_id = $1', [user.id]);
      await dbQuery(
        `INSERT INTO app_notifications (user_id, notification_id, notification_json)
         SELECT $1, COALESCE(NULLIF(n->>'id', ''), md5(n::text)), n
         FROM jsonb_array_elements($2::jsonb) n`,
        [user.id, JSON.stringify(notifications)]
      );
    } catch (normalizedError) {
      console.error('[notifications] Normalized sync deferred:', normalizedError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in PUT /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
