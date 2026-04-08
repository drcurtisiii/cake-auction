import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VIEWER_TTL_SECONDS = 45;

async function getActiveViewerCount(auctionId: string) {
  const sql = getDb();

  await sql`
    DELETE FROM auction_viewers
    WHERE auction_id = ${auctionId}
      AND last_seen_at < NOW() - (${VIEWER_TTL_SECONDS} * INTERVAL '1 second')
  `;

  const rows = await sql`
    SELECT COUNT(*)::int AS viewer_count
    FROM auction_viewers
    WHERE auction_id = ${auctionId}
      AND last_seen_at >= NOW() - (${VIEWER_TTL_SECONDS} * INTERVAL '1 second')
  `;

  return Number(rows[0]?.viewer_count ?? 0);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const viewerCount = await getActiveViewerCount(id);
    return NextResponse.json({ viewerCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch viewer count' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const viewerKey =
      typeof body?.viewerKey === 'string' && body.viewerKey.trim()
        ? body.viewerKey.trim()
        : null;
    const pageKind =
      body?.pageKind === 'admin' || body?.pageKind === 'public'
        ? body.pageKind
        : 'public';

    if (!viewerKey) {
      return NextResponse.json({ error: 'viewerKey is required' }, { status: 400 });
    }

    const sql = getDb();

    await sql`
      INSERT INTO auction_viewers (auction_id, viewer_key, page_kind, last_seen_at)
      VALUES (${id}, ${viewerKey}, ${pageKind}, NOW())
      ON CONFLICT (auction_id, viewer_key, page_kind)
      DO UPDATE SET last_seen_at = NOW()
    `;

    const viewerCount = await getActiveViewerCount(id);
    return NextResponse.json({ viewerCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update viewer count' },
      { status: 500 },
    );
  }
}
