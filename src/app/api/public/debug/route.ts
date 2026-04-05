import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

// Temporary diagnostic endpoint — remove after debugging
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || '';

    // Get summary of all documents in the database
    const { rows } = await dbQuery<{ user_id: string; total: number; doc_summary: any }>(
      `SELECT 
        user_id,
        jsonb_array_length(documents_json) as total,
        (SELECT jsonb_agg(jsonb_build_object(
          'id', d->>'id',
          'type', d->>'type',
          'status', d->>'status',
          'share_token', d->>'share_token',
          'clientEmail', d->>'clientEmail',
          'estimateNumber', d->>'estimateNumber',
          'invoiceNumber', d->>'invoiceNumber'
        ))
        FROM jsonb_array_elements(documents_json) d) as doc_summary
      FROM app_state
      LIMIT 5`
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'No data in app_state', rows: [] });
    }

    // If a token was provided, try to find it
    let tokenMatch = null;
    if (token) {
      const { rows: matchRows } = await dbQuery(
        `SELECT doc->>'id' as id, doc->>'type' as type, doc->>'share_token' as token, doc->>'clientEmail' as email
         FROM app_state, LATERAL jsonb_array_elements(documents_json) AS doc
         WHERE doc->>'share_token' = $1
         LIMIT 1`,
        [token]
      );
      tokenMatch = matchRows.length > 0 ? matchRows[0] : 'NOT FOUND';
    }

    return NextResponse.json({
      totalUsers: rows.length,
      users: rows.map(r => ({
        userId: r.user_id,
        totalDocs: r.total,
        documents: r.doc_summary,
      })),
      tokenMatch,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
