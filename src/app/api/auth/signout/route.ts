import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/server-auth';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Signout failed' }, { status: 500 });
  }
}
