import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId') || '';

    if (!shareId) {
      return NextResponse.json({ error: 'Missing shareId' }, { status: 400 });
    }

    const { rows } = await dbQuery<{ user_id: string; doc: any }>(
      `
        SELECT user_id, doc
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

    return NextResponse.json({ document: rows[0].doc, ownerId: rows[0].user_id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not fetch public document' }, { status: 500 });
  }
}
