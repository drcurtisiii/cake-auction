import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/results/[auctionId] — Public results endpoint
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ auctionId: string }> },
) {
  try {
    const { auctionId } = await params;
    const sql = getDb();

    // Verify auction exists
    const auctionRows = await sql`
      SELECT id, title, thank_you_msg, pickup_date, pickup_time, pickup_location
      FROM auctions
      WHERE id = ${auctionId}
      LIMIT 1
    `;

    if (auctionRows.length === 0) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 },
      );
    }

    const auction = auctionRows[0];

    // For each cake, get the highest bid joined with bidder name
    const winners = await sql`
      SELECT
        c.id AS cake_id,
        c.name AS cake_name,
        c.beneficiary_kid,
        bi.name AS winner_name,
        b.amount AS winning_bid
      FROM cakes c
      LEFT JOIN LATERAL (
        SELECT b2.amount, b2.bidder_id
        FROM bids b2
        WHERE b2.cake_id = c.id
        ORDER BY b2.amount DESC
        LIMIT 1
      ) b ON true
      LEFT JOIN bidders bi ON bi.id = b.bidder_id
      WHERE c.auction_id = ${auctionId}
      ORDER BY c.sort_order
    `;

    // Grand total: sum of all winning bids
    const grandTotal = winners.reduce(
      (sum, w) => sum + (Number(w.winning_bid) || 0),
      0,
    );

    // Per-kid totals grouped by beneficiary_kid
    const kidMap = new Map<string, number>();
    for (const w of winners) {
      const kid = w.beneficiary_kid || 'Unassigned';
      kidMap.set(kid, (kidMap.get(kid) || 0) + (Number(w.winning_bid) || 0));
    }
    const perKidTotals = Array.from(kidMap.entries()).map(
      ([kid_name, total_raised]) => ({ kid_name, total_raised }),
    );

    const auctionInfo = {
      title: auction.title,
      thank_you_msg: auction.thank_you_msg,
      pickup_date: auction.pickup_date,
      pickup_time: auction.pickup_time,
      pickup_location: auction.pickup_location,
    };

    return NextResponse.json({
      grandTotal,
      winners,
      perKidTotals,
      auctionInfo,
    });
  } catch (err) {
    console.error('GET /api/results/[auctionId] error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 },
    );
  }
}
