import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbQuery } from '@/lib/server-db';
import { createSession } from '@/lib/server-auth';
import { createOnboardingSeed } from '@/lib/onboarding-seed';

// Simple in-memory rate limiter
const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_SIGNUPS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = signupAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    signupAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_SIGNUPS;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many signup attempts. Try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const { rows: existing } = await dbQuery<{ id: string }>(
      'SELECT id FROM app_users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'User already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows: inserted } = await dbQuery<{ id: string; email: string }>(
      'INSERT INTO app_users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );

    const user = inserted[0];

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

    await createSession(user.id);

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Signup failed' }, { status: 500 });
  }
}
