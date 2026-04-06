import { createHmac } from 'crypto';
import { format } from 'date-fns';

export const COOKIE_NAME = 'cake_auction_admin';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret) {
    throw new Error('ADMIN_AUTH_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * The admin passcode is today's date in MMDDYY format.
 */
export function validatePasscode(passcode: string): boolean {
  const today = format(new Date(), 'MMddyy');
  return passcode === today;
}

/**
 * Creates an HMAC-SHA256 signed cookie value.
 * Format: `${deviceToken}.${expiresAt}.${signature}`
 */
export function createSessionCookie(deviceToken: string): string {
  const expiresAt = Date.now() + THIRTY_DAYS_MS;
  const payload = `${deviceToken}.${expiresAt}`;
  const signature = createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Verifies the HMAC signature and checks expiry.
 */
export function verifySessionCookie(
  cookieValue: string
): { valid: boolean; deviceToken?: string } {
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 3) {
      return { valid: false };
    }

    const [deviceToken, expiresAtStr, providedSignature] = parts;
    const payload = `${deviceToken}.${expiresAtStr}`;
    const expectedSignature = createHmac('sha256', getSecret())
      .update(payload)
      .digest('hex');

    if (providedSignature !== expectedSignature) {
      return { valid: false };
    }

    const expiresAt = Number(expiresAtStr);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { valid: false };
    }

    return { valid: true, deviceToken };
  } catch {
    return { valid: false };
  }
}
