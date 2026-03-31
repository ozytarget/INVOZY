import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';
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

    const notifications = rows.length > 0 && Array.isArray(rows[0].notifications_json)
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in PUT /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
