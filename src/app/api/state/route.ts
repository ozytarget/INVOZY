import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { createOnboardingSeed } from '@/lib/onboarding-seed';
import { z } from 'zod';

const statePayloadSchema = z.object({
  clients: z.array(z.record(z.unknown())).default([]),
  documents: z.array(z.record(z.unknown())).default([]),
  companySettings: z.record(z.unknown()).default({}),
  subcontractors: z.array(z.record(z.unknown())).default([]),
  updated_at: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await dbQuery<{ clients_json: any; documents_json: any; company_settings_json: any; subcontractors_json: any; updated_at: string }>(
      `
        SELECT clients_json, documents_json, company_settings_json, subcontractors_json, updated_at
        FROM app_state
        WHERE user_id = $1
        LIMIT 1
      `,
      [user.id]
    );

    if (rows.length === 0) {
      const seed = createOnboardingSeed(user.id);
      await dbQuery(
        `
          INSERT INTO app_state (user_id, clients_json, documents_json, company_settings_json, updated_at)
          VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, now())
          ON CONFLICT (user_id) DO NOTHING
        `,
        [
          user.id,
          JSON.stringify(seed.clients),
          JSON.stringify(seed.documents),
          JSON.stringify(seed.companySettings),
        ]
      );
      return NextResponse.json(seed);
    }

    const row = rows[0];
    return NextResponse.json({
      clients: Array.isArray(row.clients_json) ? row.clients_json : [],
      documents: Array.isArray(row.documents_json) ? row.documents_json : [],
      companySettings: row.company_settings_json || {},
      subcontractors: Array.isArray(row.subcontractors_json) ? row.subcontractors_json : [],
      updated_at: row.updated_at,
    });
  } catch (error: any) {
    console.error('[API /api/state GET] Error:', error?.message, error?.stack);
    return NextResponse.json({ error: error?.message || 'Could not load state' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const rawText = await request.text();
    if (rawText.length > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = JSON.parse(rawText);
    const parsed = statePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { clients, documents, companySettings, subcontractors, updated_at: clientUpdatedAt } = parsed.data;

    // Optimistic locking: reject if server state is newer than what client last saw
    if (clientUpdatedAt) {
      const { rows: existing } = await dbQuery<{ updated_at: string }>(
        `SELECT updated_at FROM app_state WHERE user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (existing.length > 0 && new Date(existing[0].updated_at) > new Date(clientUpdatedAt)) {
        return NextResponse.json({ error: 'Conflict: server state is newer' }, { status: 409 });
      }
    }

    const result = await dbQuery<{ updated_at: string }>(
      `
        INSERT INTO app_state (user_id, clients_json, documents_json, company_settings_json, subcontractors_json, updated_at)
        VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, now())
        ON CONFLICT (user_id)
        DO UPDATE SET
          clients_json = EXCLUDED.clients_json,
          documents_json = EXCLUDED.documents_json,
          company_settings_json = EXCLUDED.company_settings_json,
          subcontractors_json = EXCLUDED.subcontractors_json,
          updated_at = now()
        RETURNING updated_at
      `,
      [user.id, JSON.stringify(clients), JSON.stringify(documents), JSON.stringify(companySettings), JSON.stringify(subcontractors)]
    );

    return NextResponse.json({ success: true, updated_at: result.rows[0]?.updated_at });
  } catch (error: any) {
    console.error('[API /api/state PUT] Error:', error?.message, error?.stack);
    return NextResponse.json({ error: error?.message || 'Could not save state' }, { status: 500 });
  }
}
