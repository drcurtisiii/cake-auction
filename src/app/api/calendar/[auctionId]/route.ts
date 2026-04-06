import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateICS } from '@/lib/ics-generator';
import type { Auction } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ auctionId: string }> }
) {
  try {
    const { auctionId } = await params;
    const sql = getDb();

    const rows = await sql`
      SELECT * FROM auctions WHERE id = ${auctionId} LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    const auction = rows[0] as Auction;

    // Build the pickup date/time. If no pickup info is set, return 404.
    if (!auction.pickup_date) {
      return NextResponse.json(
        { error: 'No pickup date set for this auction' },
        { status: 404 }
      );
    }

    // Parse pickup_date and pickup_time into start/end ISO strings.
    // pickup_date is expected as YYYY-MM-DD, pickup_time as HH:MM or similar.
    const pickupTime = auction.pickup_time || '12:00';
    const startISO = `${auction.pickup_date}T${pickupTime}:00`;
    // Default the event to 1 hour duration
    const startDate = new Date(startISO);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const icsContent = generateICS({
      title: `Cake Pickup - ${auction.title}`,
      description: `Pick up your winning cake(s) from the "${auction.title}" auction!`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      location: auction.pickup_location || 'See auction details',
    });

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pickup.ics"',
      },
    });
  } catch (error) {
    console.error('Calendar generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar file' },
      { status: 500 }
    );
  }
}
