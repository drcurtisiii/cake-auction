import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { loginSchema } from '@/lib/validators';
import {
  validatePasscode,
  createSessionCookie,
  COOKIE_NAME,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.parse(body);
    const { passcode, deviceToken } = parsed;

    if (!validatePasscode(passcode)) {
      return NextResponse.json(
        { error: 'Invalid passcode' },
        { status: 401 }
      );
    }

    // Store session in database
    const sql = getDb();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Remove any existing sessions for this device
    await sql`
      DELETE FROM admin_sessions
      WHERE device_token = ${deviceToken}
    `;

    // Create new session
    await sql`
      INSERT INTO admin_sessions (device_token, expires_at)
      VALUES (${deviceToken}, ${expiresAt.toISOString()})
    `;

    // Set HTTP-only cookie
    const cookieValue = createSessionCookie(deviceToken);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
