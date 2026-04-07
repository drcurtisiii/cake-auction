import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { bidderRegistrationSchema, bidderSchema } from '@/lib/validators';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/bidders — Register a new bidder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bidderRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { auction_id, name, phone, device_key } = parsed.data;
    const sql = getDb();
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || null;

    const existing = await sql`
      SELECT b.id, b.name, b.phone, b.device_token, b.created_at
      FROM bidder_registrations br
      JOIN bidders b ON b.id = br.bidder_id
      WHERE br.auction_id = ${auction_id}
        AND br.device_key = ${device_key}
      LIMIT 1
    `;

    if (existing.length > 0) {
      const bidderId = existing[0].id;
      const updatedBidders = await sql`
        UPDATE bidders
        SET name = ${name},
            phone = ${phone}
        WHERE id = ${bidderId}
        RETURNING id, name, phone, device_token, created_at
      `;

      await sql`
        UPDATE bidder_registrations
        SET ip_address = ${ipAddress},
            updated_at = NOW()
        WHERE auction_id = ${auction_id}
          AND device_key = ${device_key}
      `;

      return NextResponse.json(updatedBidders[0], { status: 200 });
    }

    const id = randomUUID();
    const device_token = randomUUID();

    const bidderRows = await sql`
      INSERT INTO bidders (id, name, phone, device_token)
      VALUES (${id}, ${name}, ${phone}, ${device_token})
      RETURNING id, name, phone, device_token, created_at
    `;

    await sql`
      INSERT INTO bidder_registrations (auction_id, bidder_id, device_key, ip_address)
      VALUES (${auction_id}, ${id}, ${device_key}, ${ipAddress})
    `;

    return NextResponse.json(bidderRows[0], { status: 201 });
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
    const auctionId = request.nextUrl.searchParams.get('auction_id');
    const deviceKey = request.nextUrl.searchParams.get('device_key');
    const deviceToken = request.nextUrl.searchParams.get('device_token');
    const sql = getDb();

    if (auctionId && deviceKey) {
      const rows = await sql`
        SELECT b.id, b.name, b.phone, b.device_token, b.created_at
        FROM bidder_registrations br
        JOIN bidders b ON b.id = br.bidder_id
        WHERE br.auction_id = ${auctionId}
          AND br.device_key = ${deviceKey}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'Bidder not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(rows[0]);
    }

    if (deviceToken) {
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
    }

    return NextResponse.json(
      { error: 'auction_id and device_key, or device_token, are required' },
      { status: 400 },
    );
  } catch (err) {
    console.error('GET /api/bidders error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch bidder' },
      { status: 500 },
    );
  }
}
