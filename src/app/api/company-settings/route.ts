import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';
import { getAuthenticatedUser } from '@/lib/server-auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await dbQuery<{ company_settings_json: any }>(
      'SELECT company_settings_json FROM app_state WHERE user_id = $1 LIMIT 1',
      [user.id]
    );

    return NextResponse.json({ settings: rows[0]?.company_settings_json || {} });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not load company settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const settings = body?.settings && typeof body.settings === 'object' ? body.settings : {};

    await dbQuery(
      `
        INSERT INTO app_state (user_id, company_settings_json, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (user_id)
        DO UPDATE SET
          company_settings_json = EXCLUDED.company_settings_json,
          updated_at = now()
      `,
      [user.id, JSON.stringify(settings)]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not save company settings' }, { status: 500 });
  }
}
