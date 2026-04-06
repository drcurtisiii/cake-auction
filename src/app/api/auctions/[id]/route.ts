import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { auctionSchema } from '@/lib/validators';
import { verifyAdmin } from '@/lib/admin-guard';
import { broadcastAuctionStateChange } from '@/lib/pusher-server';
import { uploadImage } from '@/lib/imgbb';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();

    const rows = await sql`
      SELECT * FROM auctions WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch auction' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    let imgbbUrl = body.imgbb_url;
    if (body.image) {
      const result = await uploadImage(body.image);
      imgbbUrl = result.url;
    }

    const parsed = auctionSchema.partial().safeParse({ ...body, imgbb_url: imgbbUrl });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const sql = getDb();

    // Fetch the existing auction so we can merge updates
    const existing = await sql`SELECT * FROM auctions WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Merge: use provided value if present, otherwise keep existing
    const merged = {
      title: data.title ?? existing[0].title,
      description: 'description' in data ? (data.description ?? null) : existing[0].description,
      imgbb_url: 'imgbb_url' in data ? (data.imgbb_url ?? null) : existing[0].imgbb_url,
      preview_at: 'preview_at' in data ? (data.preview_at ?? null) : existing[0].preview_at,
      live_at: 'live_at' in data ? (data.live_at ?? null) : existing[0].live_at,
      close_at: 'close_at' in data ? (data.close_at ?? null) : existing[0].close_at,
      status: data.status ?? existing[0].status,
      pickup_date: 'pickup_date' in data ? (data.pickup_date ?? null) : existing[0].pickup_date,
      pickup_time: 'pickup_time' in data ? (data.pickup_time ?? null) : existing[0].pickup_time,
      pickup_location: 'pickup_location' in data ? (data.pickup_location ?? null) : existing[0].pickup_location,
      thank_you_msg: 'thank_you_msg' in data ? (data.thank_you_msg ?? null) : existing[0].thank_you_msg,
    };

    const rows = await sql`
      UPDATE auctions
      SET title = ${merged.title},
          description = ${merged.description},
          imgbb_url = ${merged.imgbb_url},
          preview_at = ${merged.preview_at},
          live_at = ${merged.live_at},
          close_at = ${merged.close_at},
          status = ${merged.status},
          pickup_date = ${merged.pickup_date},
          pickup_time = ${merged.pickup_time},
          pickup_location = ${merged.pickup_location},
          thank_you_msg = ${merged.thank_you_msg},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Broadcast auction state change via Pusher if status changed (non-blocking)
    if (data.status && data.status !== existing[0].status) {
      try {
        await broadcastAuctionStateChange(id, data.status);
      } catch (pusherErr) {
        console.error('Pusher broadcastAuctionStateChange error (non-fatal):', pusherErr);
      }
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update auction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await sql`DELETE FROM auctions WHERE id = ${id}`;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete auction' },
      { status: 500 }
    );
  }
}
