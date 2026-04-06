import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { bidderSchema } from '@/lib/validators';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/bidders — Register a new bidder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bidderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, phone } = parsed.data;
    const id = randomUUID();
    const device_token = randomUUID();

    const sql = getDb();

    const rows = await sql`
      INSERT INTO bidders (id, name, phone, device_token)
      VALUES (${id}, ${name}, ${phone}, ${device_token})
      RETURNING id, name, phone, device_token, created_at
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/bidders error:', err);
    return NextResponse.json(
      { error: 'Failed to register bidder' },
      { status: 500 },
    );
  }
}

// GET /api/bidders?device_token=... — Look up a bidder by device token
export async function GET(request: NextRequest) {
  try {
    const deviceToken = request.nextUrl.searchParams.get('device_token');

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'device_token query parameter is required' },
        { status: 400 },
      );
    }

    const sql = getDb();

    const rows = await sql`
      SELECT id, name, phone, device_token, created_at
      FROM bidders
      WHERE device_token = ${deviceToken}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Bidder not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('GET /api/bidders error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch bidder' },
      { status: 500 },
    );
  }
}
