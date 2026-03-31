import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId') || '';

    console.log('[API] public/company-settings GET: shareId =', shareId);

    if (!shareId) {
      console.log('[API] public/company-settings GET: ✗ Missing shareId');
      return NextResponse.json({ error: 'Missing shareId' }, { status: 400 });
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
      console.log('[API] public/company-settings GET: ✗ Owner not found for shareId:', shareId);
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
    }

    const settings = rows[0].company_settings_json || {};
    console.log('[API] public/company-settings GET: ✓ Found owner:', rows[0].user_id);
    console.log('[API] public/company-settings GET: Returning settings:', Object.keys(settings).length, 'fields');
    console.log('[API] public/company-settings GET: Settings data:', settings);
    
    // Return in same format as authenticated endpoint: { settings: {...} }
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('[API] public/company-settings GET: ERROR', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
