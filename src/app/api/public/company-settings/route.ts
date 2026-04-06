import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId') || '';

    console.log('[public/company-settings] Request received');

    if (!shareId || !UUID_REGEX.test(shareId)) {
      return NextResponse.json({ error: 'Invalid share ID' }, { status: 400 });
    }

    // Find the owner of this document
    const { rows } = await dbQuery<{ user_id: string; company_settings_json: any }>(
      `
        SELECT user_id, company_settings_json
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
      console.log('[public/company-settings] Owner not found');
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
    }

    const settings = rows[0].company_settings_json || {};
    console.log('[public/company-settings] Owner resolved');
    
    // Return in same format as authenticated endpoint: { settings: {...} }
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('[API] public/company-settings GET: ERROR', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
