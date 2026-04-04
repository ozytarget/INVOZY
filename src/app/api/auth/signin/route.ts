import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbQuery } from '@/lib/server-db';
import { createSession } from '@/lib/server-auth';

// Simple in-memory rate limiter (per-process, reset on deploy)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

// Pre-computed dummy hash to prevent timing attacks
const DUMMY_HASH = '$2a$12$LJ3m4ys3Lk0TSwHBbKYMceDaV1MXDfmJqKSBfvYkfGNB2cEyMq1HW';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Rate limit by email
    if (isRateLimited(email)) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    const { rows } = await dbQuery<{ id: string; email: string; password_hash: string }>(
      'SELECT id, email, password_hash FROM app_users WHERE email = $1 LIMIT 1',
      [email]
    );

    // Always run bcrypt.compare to prevent timing attacks
    const user = rows.length > 0 ? rows[0] : null;
    const isValidPassword = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);

    if (!user || !isValidPassword) {
      return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
    }

    await createSession(user.id);

    await dbQuery(
      'INSERT INTO app_state (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
      [user.id]
    );

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Signin failed' }, { status: 500 });
  }
}
