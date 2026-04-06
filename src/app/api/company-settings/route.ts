import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';
import { getAuthenticatedUser } from '@/lib/server-auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      console.log('[API] company-settings GET: No authenticated user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await dbQuery<{ company_settings_json: any }>(
      'SELECT company_settings_json FROM app_state WHERE user_id = $1 LIMIT 1',
      [user.id]
    );

    const settings = rows[0]?.company_settings_json || {};
    console.log('[company-settings] GET success');

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('[API] company-settings GET: ERROR', error);
    return NextResponse.json({ error: error?.message || 'Could not load company settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      console.log('[API] company-settings PUT: No authenticated user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const settings = body?.settings && typeof body.settings === 'object' ? body.settings : {};

    console.log('[company-settings] PUT request');

    const result = await dbQuery(
      `
        INSERT INTO app_state (user_id, company_settings_json, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (user_id)
        DO UPDATE SET
          company_settings_json = EXCLUDED.company_settings_json,
          updated_at = now()
        RETURNING company_settings_json
      `,
      [user.id, JSON.stringify(settings)]
    );

    const savedSettings = result.rows[0]?.company_settings_json || settings;
    console.log('[company-settings] PUT success');

    return NextResponse.json({ success: true, saved: savedSettings });
  } catch (error: any) {
    console.error('[API] company-settings PUT: ERROR', error);
    return NextResponse.json({ error: error?.message || 'Could not save company settings' }, { status: 500 });
  }
}
