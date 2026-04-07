import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { auctionSchema } from '@/lib/validators';
import { verifyAdmin } from '@/lib/admin-guard';
import { seedDefaultRules } from '@/lib/default-rules';
import { uploadImage } from '@/lib/imgbb';
import { localDateTimeToUtcIso } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM auctions ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    let imgbbUrl = body.imgbb_url;
    if (body.image) {
      const result = await uploadImage(body.image);
      imgbbUrl = result.url;
    }

    const parsed = auctionSchema.safeParse({ ...body, imgbb_url: imgbbUrl });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const sql = getDb();
    const previewAt = localDateTimeToUtcIso(data.preview_at);
    const liveAt = localDateTimeToUtcIso(data.live_at);
    const closeAt = localDateTimeToUtcIso(data.close_at);
    const cakeSubmissionCloseAt = localDateTimeToUtcIso(data.cake_submission_close_at);

    const rows = await sql`
      INSERT INTO auctions (title, description, imgbb_url, preview_at, live_at, close_at, cake_submission_close_at, status,
                            pickup_date, pickup_time, pickup_end_time, pickup_location, thank_you_msg)
      VALUES (${data.title}, ${data.description ?? null}, ${data.imgbb_url ?? null}, ${previewAt},
              ${liveAt}, ${closeAt}, ${cakeSubmissionCloseAt}, ${data.status ?? 'draft'},
              ${data.pickup_date ?? null}, ${data.pickup_time ?? null}, ${data.pickup_end_time ?? null},
              ${data.pickup_location ?? null}, ${data.thank_you_msg ?? null})
      RETURNING *
    `;

    try {
      await seedDefaultRules(rows[0].id);
    } catch (seedError) {
      await sql`DELETE FROM auctions WHERE id = ${rows[0].id}`;
      throw seedError;
    }

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create auction' },
      { status: 500 }
    );
  }
}
