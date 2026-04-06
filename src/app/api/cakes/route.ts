import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-guard';
import { cakeSchema } from '@/lib/validators';
import { uploadImage } from '@/lib/imgbb';
import { broadcastNewCake } from '@/lib/pusher-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cakes?auctionId=<uuid>
 * List all cakes for an auction, ordered by sort_order ASC.
 * Includes the current highest bid amount for each cake.
 */
export async function GET(request: NextRequest) {
  try {
    const auctionId = request.nextUrl.searchParams.get('auctionId');
    if (!auctionId) {
      return NextResponse.json(
        { error: 'auctionId query parameter is required' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const cakes = await sql`
      SELECT
        c.*,
        COALESCE(b.highest_bid, 0) AS highest_bid
      FROM cakes c
      LEFT JOIN (
        SELECT cake_id, MAX(amount) AS highest_bid
        FROM bids
        GROUP BY cake_id
      ) b ON b.cake_id = c.id
      WHERE c.auction_id = ${auctionId}
      ORDER BY c.sort_order ASC
    `;

    return NextResponse.json(cakes);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cakes
 * Create a new cake. Requires admin auth.
 * If a base64 `image` field is provided, it is uploaded to ImgBB first.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // If a raw base64 image is provided, upload to ImgBB
    let imgbbUrl = body.imgbb_url;
    if (body.image) {
      const result = await uploadImage(body.image);
      imgbbUrl = result.url;
    }

    const parsed = cakeSchema.parse({ ...body, imgbb_url: imgbbUrl });

    const sql = getDb();
    const rows = await sql`
      INSERT INTO cakes (
        auction_id, name, flavor, description,
        donor_name, beneficiary_kid, imgbb_url,
        starting_price, min_increment, max_increment, sort_order
      ) VALUES (
        ${parsed.auction_id},
        ${parsed.name},
        ${parsed.flavor ?? null},
        ${parsed.description ?? null},
        ${parsed.donor_name ?? null},
        ${parsed.beneficiary_kid ?? null},
        ${parsed.imgbb_url ?? null},
        ${parsed.starting_price},
        ${parsed.min_increment},
        ${parsed.max_increment},
        ${parsed.sort_order}
      )
      RETURNING *
    `;

    // Broadcast new cake via Pusher (non-blocking)
    try {
      await broadcastNewCake(parsed.auction_id, rows[0]);
    } catch (pusherErr) {
      console.error('Pusher broadcastNewCake error (non-fatal):', pusherErr);
    }

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
