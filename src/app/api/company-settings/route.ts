import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbQuery, getNormalizedState } from '@/lib/server-db';
import { getAuthenticatedUser } from '@/lib/server-auth';

// Company logos are stored inline as data URLs and can be hundreds of KB.
// Matches the 5MB cap of PUT /api/state, which persists the same settings, so
// a logo accepted by one route can never be rejected by the other.
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB

const putBodySchema = z
  .object({
    settings: z.object({}).passthrough().optional(),
  })
  .passthrough();

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

    const normalized = await getNormalizedState(user.id);
    const settings = Object.keys(normalized.companySettings).length > 0
      ? normalized.companySettings
      : (rows[0]?.company_settings_json || {});
    console.log('[company-settings] GET success');

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[API] company-settings GET: ERROR', error);
    return NextResponse.json({ error: 'Could not load company settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      console.log('[API] company-settings PUT: No authenticated user');
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

    const settings = validated.data.settings ?? {};

    console.log('[company-settings] PUT request');

    // The ON CONFLICT arm intentionally does not bump updated_at: that column
    // is the optimistic lock for PUT /api/state, and settings travel in that
    // payload too, so bumping here primed spurious 409s on the next doc save.
    const result = await dbQuery(
      `
        INSERT INTO app_state (user_id, company_settings_json, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (user_id)
        DO UPDATE SET
          company_settings_json = EXCLUDED.company_settings_json
        RETURNING company_settings_json
      `,
      [user.id, JSON.stringify(settings)]
    );

    const savedSettings = result.rows[0]?.company_settings_json || settings;
    try {
      await dbQuery(
        `INSERT INTO app_company_settings (user_id, settings_json, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (user_id) DO UPDATE SET settings_json = EXCLUDED.settings_json, updated_at = now()`,
        [user.id, JSON.stringify(savedSettings)]
      );
    } catch (normalizedError) {
      console.error('[company-settings] Normalized sync deferred:', normalizedError);
    }
    console.log('[company-settings] PUT success');

    return NextResponse.json({ success: true, saved: savedSettings });
  } catch (error) {
    console.error('[API] company-settings PUT: ERROR', error);
    return NextResponse.json({ error: 'Could not save company settings' }, { status: 500 });
  }
}
