import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server-db';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { createOnboardingSeed } from '@/lib/onboarding-seed';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await dbQuery<{ clients_json: any; documents_json: any; company_settings_json: any; subcontractors_json: any }>(
      `
        SELECT clients_json, documents_json, company_settings_json, subcontractors_json
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
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not load state' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const clients = Array.isArray(body?.clients) ? body.clients : [];
    const documents = Array.isArray(body?.documents) ? body.documents : [];
    const companySettings = body?.companySettings && typeof body.companySettings === 'object'
      ? body.companySettings
      : {};
    const subcontractors = Array.isArray(body?.subcontractors) ? body.subcontractors : [];

    await dbQuery(
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
      `,
      [user.id, JSON.stringify(clients), JSON.stringify(documents), JSON.stringify(companySettings), JSON.stringify(subcontractors)]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not save state' }, { status: 500 });
  }
}
