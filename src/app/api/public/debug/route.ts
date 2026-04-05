import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';

// Temporary diagnostic endpoint — remove after debugging
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || '';

    // If a token was provided, search for it specifically
    if (token) {
      const { rows: matchRows } = await dbQuery(
        `SELECT doc->>'id' as id, doc->>'type' as type, doc->>'share_token' as token, 
                doc->>'clientEmail' as email, doc->>'status' as status,
                doc->>'estimateNumber' as est_num, doc->>'invoiceNumber' as inv_num
         FROM app_state, LATERAL jsonb_array_elements(documents_json) AS doc
         WHERE doc->>'share_token' = $1
         LIMIT 1`,
        [token]
      );
      
      return NextResponse.json({
        searchedToken: token,
        found: matchRows.length > 0,
        match: matchRows.length > 0 ? matchRows[0] : null,
      });
    }

    // Show compact summary: just user_id, doc count, and all share_tokens
    const { rows } = await dbQuery<{ user_id: string; doc_list: any }>(
      `SELECT 
        user_id,
        (SELECT jsonb_agg(jsonb_build_object(
          'type', d->>'type',
          'token', d->>'share_token',
          'num', COALESCE(d->>'estimateNumber', d->>'invoiceNumber')
        ))
        FROM jsonb_array_elements(documents_json) d) as doc_list
      FROM app_state`
    );

    return NextResponse.json({
      users: rows.map(r => ({
        u: r.user_id,
        docs: r.doc_list,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
