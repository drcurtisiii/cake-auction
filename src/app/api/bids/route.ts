import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import { broadcastBid } from '@/lib/pusher-server';

export const dynamic = 'force-dynamic';

// POST /api/bids — Place a bid
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cake_id, bidder_id, amount, device_key } = body;

    if (!cake_id || !bidder_id || !device_key || amount == null) {
      return NextResponse.json(
        { error: 'cake_id, bidder_id, device_key, and amount are required' },
        { status: 400 },
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 },
      );
    }

    const sql = getDb();

    // Get the cake and its auction in one query
    const cakeRows = await sql`
      SELECT c.id, c.auction_id, c.starting_price, c.min_increment, c.max_increment,
             a.status, a.live_at, a.close_at
      FROM cakes c
      JOIN auctions a ON a.id = c.auction_id
      WHERE c.id = ${cake_id}
      LIMIT 1
    `;

    if (cakeRows.length === 0) {
      return NextResponse.json(
        { error: 'Cake not found' },
        { status: 404 },
      );
    }

    const cake = cakeRows[0];
    const registrationRows = await sql`
      SELECT bidder_id
      FROM bidder_registrations
      WHERE auction_id = ${cake.auction_id}
        AND bidder_id = ${bidder_id}
        AND device_key = ${device_key}
      LIMIT 1
    `;

    if (registrationRows.length === 0) {
      return NextResponse.json(
        { error: 'Bidder registration not found for this auction.' },
        { status: 403 },
      );
    }

    // Check auction is live
    const now = new Date();
    const liveAt = cake.live_at ? new Date(cake.live_at) : null;
    const closeAt = cake.close_at ? new Date(cake.close_at) : null;

    if (cake.status !== 'published' || !liveAt || now < liveAt) {
      return NextResponse.json(
        { error: 'The auction is not currently live. Bidding has not started yet.' },
        { status: 400 },
      );
    }

    if (closeAt && now >= closeAt) {
      return NextResponse.json(
        { error: 'The auction has closed. Bidding is no longer accepted.' },
        { status: 400 },
      );
    }

    // Get current highest bid atomically and validate + insert
    const id = randomUUID();
    const minIncrement = Number(cake.min_increment);
    const maxIncrement = Number(cake.max_increment);
    const startingPrice = Number(cake.starting_price);

    // Atomic check-and-insert: get the current max bid, validate, and insert
    // in a single statement using a CTE to prevent race conditions
    const result = await sql`
      WITH current_max AS (
        SELECT COALESCE(MAX(amount), ${startingPrice}) AS highest
        FROM bids
        WHERE cake_id = ${cake_id}
      )
      INSERT INTO bids (id, cake_id, bidder_id, amount, bid_time)
      SELECT ${id}, ${cake_id}, ${bidder_id}, ${amount}, NOW()
      FROM current_max
      WHERE ${amount} >= current_max.highest + ${minIncrement}
        AND ${amount} <= current_max.highest + ${maxIncrement}
      RETURNING id, cake_id, bidder_id, amount, bid_time
    `;

    if (result.length === 0) {
      // The insert didn't happen — bid was out of range
      // Fetch the current highest to give a helpful error message
      const maxRows = await sql`
        SELECT COALESCE(MAX(amount), ${startingPrice}) AS highest
        FROM bids
        WHERE cake_id = ${cake_id}
      `;
      const currentHighest = Number(maxRows[0].highest);
      const minAllowed = currentHighest + minIncrement;
      const maxAllowed = currentHighest + maxIncrement;

      return NextResponse.json(
        {
          error: `Bid must be between $${minAllowed.toFixed(2)} and $${maxAllowed.toFixed(2)}. Current highest bid is $${currentHighest.toFixed(2)}.`,
        },
        { status: 400 },
      );
    }

    // Broadcast the new bid via Pusher (non-blocking)
    try {
      // Get auction_id from the cake
      // Get bidder info
      const bidderRows = await sql`
        SELECT name, phone FROM bidders WHERE id = ${bidder_id} LIMIT 1
      `;
      const bidderName = bidderRows[0]?.name ?? 'Unknown';
      const bidderPhone = bidderRows[0]?.phone ?? undefined;
      const cakeStateRows = await sql`
        SELECT COUNT(*)::int AS bid_count
        FROM bids
        WHERE cake_id = ${cake_id}
      `;
      const bidCount = Number(cakeStateRows[0]?.bid_count ?? 0);

      if (cake.auction_id) {
        await broadcastBid(cake.auction_id, {
          id: result[0].id,
          cake_id: result[0].cake_id,
          bidder_id: result[0].bidder_id,
          amount: Number(result[0].amount),
          bid_time: result[0].bid_time,
          bidder_name: bidderName,
          bidder_phone: bidderPhone,
          bid_count: bidCount,
          highest_bidder_name: bidderName,
        });
      }
    } catch (pusherErr) {
      console.error('Pusher broadcastBid error (non-fatal):', pusherErr);
    }

    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/bids error:', err);
    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 },
    );
  }
}

// GET /api/bids?cake_id=... — Get bids for a cake
export async function GET(request: NextRequest) {
  try {
    const cakeId = request.nextUrl.searchParams.get('cake_id');
    const auctionId = request.nextUrl.searchParams.get('auction_id');

    const sql = getDb();

    if (auctionId) {
      const rows = await sql`
        SELECT
          b.id,
          b.cake_id,
          b.bidder_id,
          b.amount,
          b.bid_time,
          c.name AS cake_name,
          bi.name AS bidder_name,
          bi.phone AS bidder_phone
        FROM bids b
        JOIN cakes c ON c.id = b.cake_id
        JOIN bidders bi ON bi.id = b.bidder_id
        WHERE c.auction_id = ${auctionId}
        ORDER BY b.bid_time DESC
      `;

      return NextResponse.json(rows);
    }

    if (!cakeId) {
      return NextResponse.json(
        { error: 'cake_id or auction_id query parameter is required' },
        { status: 400 },
      );
    }

    const rows = await sql`
      SELECT b.id, b.cake_id, b.bidder_id, b.amount, b.bid_time,
             bi.name AS bidder_name,
             bi.phone AS bidder_phone
      FROM bids b
      JOIN bidders bi ON bi.id = b.bidder_id
      WHERE b.cake_id = ${cakeId}
      ORDER BY b.amount DESC, b.bid_time ASC
    `;

    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/bids error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 },
    );
  }
}
