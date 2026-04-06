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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cake-auction-app.netlify.app';
    const eventStart = auction.live_at || auction.preview_at;
    if (!eventStart) {
      return NextResponse.json(
        { error: 'No auction event time is set for this auction' },
        { status: 404 }
      );
    }

    const startDate = new Date(eventStart);
    const endDate = auction.close_at
      ? new Date(auction.close_at)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    const icsContent = generateICS({
      title: `Cake Auction - ${auction.title}`,
      description: `Join the "${auction.title}" cake auction.\n\nView auction: ${siteUrl}/auction/${auctionId}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      location: siteUrl,
    });

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="cake-auction.ics"',
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
