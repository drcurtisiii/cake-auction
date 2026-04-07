import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-guard';
import { formatInTimeZone } from 'date-fns-tz';
import { getAppTimeZone } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

// Temporary debugging helper. Remove this route after live-testing is complete.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sql = getDb();
    const timeZone = getAppTimeZone();
    const now = new Date();
    const previewAt = now.toISOString();
    const liveAt = new Date(now.getTime() + 2 * 60 * 1000);
    const closeAt = new Date(now.getTime() + 5 * 60 * 1000);
    const pickupAt = new Date(now.getTime() + 60 * 60 * 1000);
    const pickupDate = formatInTimeZone(pickupAt, timeZone, 'yyyy-MM-dd');
    const pickupTime = formatInTimeZone(pickupAt, timeZone, 'HH:mm');

    const auctionRows = await sql`
      SELECT id
      FROM auctions
      WHERE id = ${id}
      LIMIT 1
    `;

    if (auctionRows.length === 0) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    await sql`
      DELETE FROM bids
      WHERE cake_id IN (
        SELECT id
        FROM cakes
        WHERE auction_id = ${id}
      )
    `;

    const updatedRows = await sql`
      UPDATE auctions
      SET preview_at = ${previewAt},
          live_at = ${liveAt.toISOString()},
          close_at = ${closeAt.toISOString()},
          pickup_date = ${pickupDate},
          pickup_time = ${pickupTime},
          status = 'published',
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      auction: updatedRows[0],
      message: 'Auction bids cleared and schedule reset for testing.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to reset auction',
      },
      { status: 500 }
    );
  }
}
