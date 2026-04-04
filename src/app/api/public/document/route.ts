import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId') || '';

    if (!shareId || !UUID_REGEX.test(shareId)) {
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

    if (rows.length === 0) {
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
