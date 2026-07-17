import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

const getPool = () => {
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }

  return pool;
};

const ensureSchema = async () => {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    const db = getPool();
    await db.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_sessions (
        token TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
        clients_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        documents_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        company_settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        notifications_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        subcontractors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(`
      ALTER TABLE app_state ADD COLUMN IF NOT EXISTS notifications_json JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
    await db.query(`
      ALTER TABLE app_state ADD COLUMN IF NOT EXISTS subcontractors_json JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);

    // Additive normalized storage for the migration away from the monolithic
    // app_state JSON. The legacy columns remain untouched until all consumers
    // have been migrated and verified.
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_documents (
        user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL,
        document_json JSONB NOT NULL,
        share_token TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, document_id)
      );
      CREATE INDEX IF NOT EXISTS app_documents_share_token_idx ON app_documents(share_token);
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_document_photos (
        user_id UUID NOT NULL,
        document_id TEXT NOT NULL,
        photo_index INTEGER NOT NULL,
        photo_json JSONB NOT NULL,
        PRIMARY KEY (user_id, document_id, photo_index),
        FOREIGN KEY (user_id, document_id)
          REFERENCES app_documents(user_id, document_id) ON DELETE CASCADE
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_clients (
        user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        client_key TEXT NOT NULL,
        client_json JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, client_key)
      );
      CREATE TABLE IF NOT EXISTS app_subcontractors (
        user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        subcontractor_id TEXT NOT NULL,
        subcontractor_json JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, subcontractor_id)
      );
      CREATE TABLE IF NOT EXISTS app_notifications (
        user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        notification_id TEXT NOT NULL,
        notification_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, notification_id)
      );
      CREATE TABLE IF NOT EXISTS app_company_settings (
        user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
        settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Backfill is idempotent and never deletes or rewrites legacy data.
    await db.query(`
      INSERT INTO app_documents (user_id, document_id, document_json, share_token)
      SELECT s.user_id, d->>'id', d, d->>'share_token'
      FROM app_state s
      CROSS JOIN LATERAL jsonb_array_elements(s.documents_json) d
      WHERE d->>'id' IS NOT NULL
      ON CONFLICT (user_id, document_id) DO NOTHING;

      INSERT INTO app_document_photos (user_id, document_id, photo_index, photo_json)
      SELECT s.user_id, d->>'id', p.ordinality - 1, p.photo
      FROM app_state s
      CROSS JOIN LATERAL jsonb_array_elements(s.documents_json) d
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(d->'projectPhotos', '[]'::jsonb)) WITH ORDINALITY p(photo, ordinality)
      WHERE d->>'id' IS NOT NULL
      ON CONFLICT (user_id, document_id, photo_index) DO NOTHING;

      INSERT INTO app_company_settings (user_id, settings_json)
      SELECT user_id, company_settings_json FROM app_state
      ON CONFLICT (user_id) DO NOTHING;

      INSERT INTO app_clients (user_id, client_key, client_json)
      SELECT s.user_id, COALESCE(NULLIF(c->>'email', ''), md5(c::text)), c
      FROM app_state s
      CROSS JOIN LATERAL jsonb_array_elements(s.clients_json) c
      ON CONFLICT (user_id, client_key) DO NOTHING;

      INSERT INTO app_subcontractors (user_id, subcontractor_id, subcontractor_json)
      SELECT s.user_id, COALESCE(NULLIF(sc->>'id', ''), md5(sc::text)), sc
      FROM app_state s
      CROSS JOIN LATERAL jsonb_array_elements(s.subcontractors_json) sc
      ON CONFLICT (user_id, subcontractor_id) DO NOTHING;

      INSERT INTO app_notifications (user_id, notification_id, notification_json)
      SELECT s.user_id, COALESCE(NULLIF(n->>'id', ''), md5(n::text)), n
      FROM app_state s
      CROSS JOIN LATERAL jsonb_array_elements(s.notifications_json) n
      ON CONFLICT (user_id, notification_id) DO NOTHING;
    `);
  })().catch((err) => {
    // Clear cached promise so next call retries instead of returning the rejected promise forever
    schemaReadyPromise = null;
    throw err;
  });

  return schemaReadyPromise;
};

export const dbQuery = async <T = any>(sql: string, params?: any[]) => {
  await ensureSchema();
  const db = getPool();
  const result = await db.query(sql, params);
  return result as { rows: T[]; rowCount: number | null };
};

/**
 * Keep the normalized tables in sync while app_state remains the compatibility
 * source of truth. This is intentionally best-effort: a normalized write must
 * never make the existing document save fail during the migration window.
 */
export const syncNormalizedState = async (userId: string, state: {
  clients: unknown[];
  documents: unknown[];
  companySettings: Record<string, unknown>;
  subcontractors: unknown[];
  notifications?: unknown[];
}) => {
  await dbQuery('DELETE FROM app_document_photos WHERE user_id = $1', [userId]);
  await dbQuery('DELETE FROM app_documents WHERE user_id = $1', [userId]);
  await dbQuery('DELETE FROM app_clients WHERE user_id = $1', [userId]);
  await dbQuery('DELETE FROM app_subcontractors WHERE user_id = $1', [userId]);
  await dbQuery('DELETE FROM app_notifications WHERE user_id = $1', [userId]);

  await dbQuery(
    `INSERT INTO app_documents (user_id, document_id, document_json, share_token)
     SELECT $1, d->>'id', d - 'projectPhotos', d->>'share_token'
     FROM jsonb_array_elements($2::jsonb) d
     WHERE d->>'id' IS NOT NULL
     ON CONFLICT (user_id, document_id) DO UPDATE SET
       document_json = EXCLUDED.document_json,
       share_token = EXCLUDED.share_token,
       updated_at = now()`,
    [userId, JSON.stringify(state.documents)]
  );
  await dbQuery(
    `INSERT INTO app_document_photos (user_id, document_id, photo_index, photo_json)
     SELECT $1, d->>'id', p.ordinality - 1, p.photo
     FROM jsonb_array_elements($2::jsonb) d
     CROSS JOIN LATERAL jsonb_array_elements(COALESCE(d->'projectPhotos', '[]'::jsonb)) WITH ORDINALITY p(photo, ordinality)
     WHERE d->>'id' IS NOT NULL`,
    [userId, JSON.stringify(state.documents)]
  );
  await dbQuery(
    `INSERT INTO app_clients (user_id, client_key, client_json)
     SELECT $1, COALESCE(NULLIF(c->>'email', ''), md5(c::text)), c
     FROM jsonb_array_elements($2::jsonb) c`,
    [userId, JSON.stringify(state.clients)]
  );
  await dbQuery(
    `INSERT INTO app_subcontractors (user_id, subcontractor_id, subcontractor_json)
     SELECT $1, COALESCE(NULLIF(s->>'id', ''), md5(s::text)), s
     FROM jsonb_array_elements($2::jsonb) s`,
    [userId, JSON.stringify(state.subcontractors)]
  );
  if (state.notifications) {
    await dbQuery(
      `INSERT INTO app_notifications (user_id, notification_id, notification_json)
       SELECT $1, COALESCE(NULLIF(n->>'id', ''), md5(n::text)), n
       FROM jsonb_array_elements($2::jsonb) n`,
      [userId, JSON.stringify(state.notifications)]
    );
  }
  await dbQuery(
    `INSERT INTO app_company_settings (user_id, settings_json, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET settings_json = EXCLUDED.settings_json, updated_at = now()`,
    [userId, JSON.stringify(state.companySettings || {})]
  );
};

export const getNormalizedState = async (userId: string) => {
  const [documentsResult, photosResult, clientsResult, subcontractorsResult, notificationsResult, settingsResult] = await Promise.all([
    dbQuery<{ document_json: any; document_id: string }>('SELECT document_id, document_json FROM app_documents WHERE user_id = $1 ORDER BY updated_at DESC', [userId]),
    dbQuery<{ document_id: string; photo_index: number; photo_json: any }>('SELECT document_id, photo_index, photo_json FROM app_document_photos WHERE user_id = $1 ORDER BY document_id, photo_index', [userId]),
    dbQuery<{ client_json: any }>('SELECT client_json FROM app_clients WHERE user_id = $1', [userId]),
    dbQuery<{ subcontractor_json: any }>('SELECT subcontractor_json FROM app_subcontractors WHERE user_id = $1', [userId]),
    dbQuery<{ notification_json: any }>('SELECT notification_json FROM app_notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
    dbQuery<{ settings_json: any }>('SELECT settings_json FROM app_company_settings WHERE user_id = $1 LIMIT 1', [userId]),
  ]);

  const photosByDocument = new Map<string, any[]>();
  for (const row of photosResult.rows) {
    const photos = photosByDocument.get(row.document_id) || [];
    photos[row.photo_index] = row.photo_json;
    photosByDocument.set(row.document_id, photos);
  }

  const documents = documentsResult.rows.map(row => {
    const photos = photosByDocument.get(row.document_id);
    return photos?.length ? { ...row.document_json, projectPhotos: photos.filter(Boolean) } : row.document_json;
  });

  return {
    clients: clientsResult.rows.map(row => row.client_json),
    documents,
    companySettings: settingsResult.rows[0]?.settings_json || {},
    subcontractors: subcontractorsResult.rows.map(row => row.subcontractor_json),
    notifications: notificationsResult.rows.map(row => row.notification_json),
  };
};

export const resyncNormalizedFromLegacy = async (userId: string) => {
  const { rows } = await dbQuery<{
    clients_json: any;
    documents_json: any;
    company_settings_json: any;
    subcontractors_json: any;
    notifications_json: any;
  }>(
    `SELECT clients_json, documents_json, company_settings_json, subcontractors_json, notifications_json
     FROM app_state WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return;
  await syncNormalizedState(userId, {
    clients: Array.isArray(row.clients_json) ? row.clients_json : [],
    documents: Array.isArray(row.documents_json) ? row.documents_json : [],
    companySettings: row.company_settings_json || {},
    subcontractors: Array.isArray(row.subcontractors_json) ? row.subcontractors_json : [],
    notifications: Array.isArray(row.notifications_json) ? row.notifications_json : [],
  });
};

export const syncNormalizedNotifications = async (userId: string, notifications: unknown[]) => {
  await dbQuery('DELETE FROM app_notifications WHERE user_id = $1', [userId]);
  await dbQuery(
    `INSERT INTO app_notifications (user_id, notification_id, notification_json)
     SELECT $1, COALESCE(NULLIF(n->>'id', ''), md5(n::text)), n
     FROM jsonb_array_elements($2::jsonb) n`,
    [userId, JSON.stringify(notifications)]
  );
};

export const getNormalizedDocumentByShareToken = async (shareToken: string) => {
  const { rows } = await dbQuery<{ user_id: string; document_id: string; document_json: any; settings_json: any }>(
    `SELECT d.user_id, d.document_id, d.document_json, COALESCE(s.settings_json, '{}'::jsonb) AS settings_json
     FROM app_documents d
     LEFT JOIN app_company_settings s ON s.user_id = d.user_id
     WHERE d.share_token = $1 LIMIT 1`,
    [shareToken]
  );
  if (!rows[0]) return null;

  const photos = await dbQuery<{ photo_json: any }>(
    `SELECT photo_json FROM app_document_photos
     WHERE user_id = $1 AND document_id = $2 ORDER BY photo_index`,
    [rows[0].user_id, rows[0].document_id]
  );
  const document = photos.rows.length
    ? { ...rows[0].document_json, projectPhotos: photos.rows.map(row => row.photo_json) }
    : rows[0].document_json;
  return { userId: rows[0].user_id, document, companySettings: rows[0].settings_json || {} };
};
