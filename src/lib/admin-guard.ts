import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { verifySessionCookie, COOKIE_NAME } from '@/lib/auth';

/**
 * Verifies that the request is from an authenticated admin.
 * Checks both the signed cookie and the database session.
 */
export async function verifyAdmin(
  request: NextRequest
): Promise<{ authenticated: boolean; deviceToken?: string }> {
  try {
    const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
    if (!cookieValue) {
      return { authenticated: false };
    }

    const result = verifySessionCookie(cookieValue);
    if (!result.valid || !result.deviceToken) {
      return { authenticated: false };
    }

    // Verify the session still exists and hasn't expired in the database
    const sql = getDb();
    const rows = await sql`
      SELECT device_token
      FROM admin_sessions
      WHERE device_token = ${result.deviceToken}
        AND expires_at > NOW()
    `;

    if (rows.length === 0) {
      return { authenticated: false };
    }

    return { authenticated: true, deviceToken: result.deviceToken };
  } catch {
    return { authenticated: false };
  }
}
