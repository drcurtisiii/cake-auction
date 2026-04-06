import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

// GET /api/reports/[auctionId] — Admin-only reports endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auctionId: string }> },
) {
  // Admin auth check
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const { auctionId } = await params;
    const sql = getDb();
    const format = request.nextUrl.searchParams.get('format');

    // Verify auction exists
    const auctionRows = await sql`
      SELECT id, title
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

    // Winners: highest bid per cake with bidder phone and exact bid time
    const winners = await sql`
      SELECT
        c.id AS cake_id,
        c.name AS cake_name,
        c.beneficiary_kid,
        bi.name AS winner_name,
        bi.phone AS winner_phone,
        b.amount AS winning_bid,
        b.bid_time
      FROM cakes c
      LEFT JOIN LATERAL (
        SELECT b2.amount, b2.bidder_id, b2.bid_time
        FROM bids b2
        WHERE b2.cake_id = c.id
        ORDER BY b2.amount DESC
        LIMIT 1
      ) b ON true
      LEFT JOIN bidders bi ON bi.id = b.bidder_id
      WHERE c.auction_id = ${auctionId}
      ORDER BY c.sort_order
    `;

    // CSV export
    if (format === 'csv') {
      const header = 'Cake,Winner,Phone,Winning Bid,Beneficiary Kid';
      const rows = winners.map((w) => {
        const cake = csvEscape(w.cake_name || '');
        const winner = csvEscape(w.winner_name || '');
        const phone = csvEscape(w.winner_phone || '');
        const bid = w.winning_bid != null ? Number(w.winning_bid).toFixed(2) : '0.00';
        const kid = csvEscape(w.beneficiary_kid || '');
        return `${cake},${winner},${phone},${bid},${kid}`;
      });
      const csv = [header, ...rows].join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="auction-report-${auctionId}.csv"`,
        },
      });
    }

    // All bids: complete bid history ordered by bid_time DESC
    const allBids = await sql`
      SELECT
        b.id,
        b.cake_id,
        c.name AS cake_name,
        bi.name AS bidder_name,
        bi.phone AS bidder_phone,
        b.amount,
        b.bid_time
      FROM bids b
      JOIN cakes c ON c.id = b.cake_id
      JOIN bidders bi ON bi.id = b.bidder_id
      WHERE c.auction_id = ${auctionId}
      ORDER BY b.bid_time DESC
    `;

    // Grand total
    const grandTotal = winners.reduce(
      (sum, w) => sum + (Number(w.winning_bid) || 0),
      0,
    );

    // Per-kid totals
    const kidMap = new Map<string, number>();
    for (const w of winners) {
      const kid = w.beneficiary_kid || 'Unassigned';
      kidMap.set(kid, (kidMap.get(kid) || 0) + (Number(w.winning_bid) || 0));
    }
    const perKidTotals = Array.from(kidMap.entries()).map(
      ([kid_name, total_raised]) => ({ kid_name, total_raised }),
    );

    // Cake stats: per-cake totals
    const cakeStats = await sql`
      SELECT
        c.name AS cake_name,
        c.starting_price,
        COUNT(b.id)::int AS total_bids,
        COALESCE(MAX(b.amount), 0) AS winning_bid
      FROM cakes c
      LEFT JOIN bids b ON b.cake_id = c.id
      WHERE c.auction_id = ${auctionId}
      GROUP BY c.id, c.name, c.starting_price, c.sort_order
      ORDER BY c.sort_order
    `;

    return NextResponse.json({
      winners,
      allBids,
      grandTotal,
      perKidTotals,
      cakeStats,
    });
  } catch (err) {
    console.error('GET /api/reports/[auctionId] error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 },
    );
  }
}

/** Escape a value for CSV (wrap in quotes if it contains commas, quotes, or newlines) */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
