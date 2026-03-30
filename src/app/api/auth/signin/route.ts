import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbQuery } from '@/lib/server-db';
import { createSession } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const { rows } = await dbQuery<{ id: string; email: string; password_hash: string }>(
      'SELECT id, email, password_hash FROM app_users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 });
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
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
