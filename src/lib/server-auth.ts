import { cookies } from 'next/headers';
import { dbQuery } from '@/lib/server-db';

export const SESSION_COOKIE_NAME = 'invozy_session';

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export const createSession = async (userId: string) => {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await dbQuery(
    `INSERT INTO app_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expiresAt.toISOString()]
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
};

export const destroySession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await dbQuery(`DELETE FROM app_sessions WHERE token = $1`, [token]);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
};

export const getAuthenticatedUser = async (): Promise<AuthenticatedUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const { rows } = await dbQuery<AuthenticatedUser>(
    `
      SELECT u.id, u.email
      FROM app_sessions s
      JOIN app_users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now()
      LIMIT 1
    `,
    [token]
  );

  if (rows.length === 0) return null;
  return rows[0];
};
