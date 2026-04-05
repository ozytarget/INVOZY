import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId') || '';

    console.log('[PublicDoc] Received shareId:', shareId);
    console.log('[PublicDoc] UUID valid:', UUID_REGEX.test(shareId));

    if (!shareId || !UUID_REGEX.test(shareId)) {
      console.log('[PublicDoc] REJECTED: shareId failed UUID validation');
      return NextResponse.json({ error: 'Invalid shareId' }, { status: 400 });
    }

    const { rows } = await dbQuery<{ user_id: string; doc: any; company_settings_json: any }>(
      `
        SELECT user_id, doc, company_settings_json
        FROM app_state,
        LATERAL jsonb_array_elements(documents_json) AS doc
        WHERE doc->>'share_token' = $1
        LIMIT 1
      `,
      [shareId]
    );

    console.log('[PublicDoc] Query returned', rows.length, 'rows for shareId:', shareId);

    if (rows.length === 0) {
      // Debug: check if any documents exist at all with share tokens
      const { rows: debugRows } = await dbQuery<{ total_docs: number; tokens_sample: any }>(
        `SELECT 
          jsonb_array_length(documents_json) as total_docs,
          (SELECT jsonb_agg(jsonb_build_object('type', d->>'type', 'id', d->>'id', 'token', d->>'share_token'))
           FROM jsonb_array_elements(documents_json) d
           LIMIT 10) as tokens_sample
        FROM app_state
        LIMIT 1`
      );
      if (debugRows.length > 0) {
        console.log('[PublicDoc] DEBUG - Total docs in DB:', debugRows[0].total_docs);
        console.log('[PublicDoc] DEBUG - Token samples:', JSON.stringify(debugRows[0].tokens_sample));
      }
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = rows[0].doc;
    const companySettings = rows[0].company_settings_json || {};

    // Merge: company settings (current) override incomplete doc data
    const mergedDoc = {
      ...doc,
      companyName: companySettings.companyName || doc.companyName || 'Your Company',
      companyAddress: companySettings.companyAddress || doc.companyAddress || '',
      companyEmail: companySettings.companyEmail || doc.companyEmail || '',
      companyPhone: companySettings.companyPhone || doc.companyPhone || '',
      companyLogo: companySettings.companyLogo || doc.companyLogo,
      companyWebsite: companySettings.companyWebsite || doc.companyWebsite,
      contractorName: companySettings.contractorName || doc.contractorName,
      schedulingUrl: companySettings.schedulingUrl || doc.schedulingUrl,
    };

    return NextResponse.json({ document: mergedDoc, ownerId: rows[0].user_id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not fetch public document' }, { status: 500 });
  }
}
