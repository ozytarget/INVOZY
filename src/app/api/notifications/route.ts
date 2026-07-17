import { NextResponse } from 'next/server';
import { dbQuery, getNormalizedState } from '@/lib/server-db';
import { getAuthenticatedUser } from '@/lib/server-auth';

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

    return NextResponse.json({ notifications });
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

    const body = await request.json();
    const notifications = Array.isArray(body?.notifications) ? body.notifications : [];

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
