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
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(`
      ALTER TABLE app_state ADD COLUMN IF NOT EXISTS notifications_json JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
  })();

  return schemaReadyPromise;
};

export const dbQuery = async <T = any>(sql: string, params?: any[]) => {
  await ensureSchema();
  const db = getPool();
  const result = await db.query(sql, params);
  return result as { rows: T[]; rowCount: number | null };
};
