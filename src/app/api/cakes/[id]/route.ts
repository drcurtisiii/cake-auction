import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-guard';
import { cakeSchema } from '@/lib/validators';
import { uploadImage } from '@/lib/imgbb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cakes/[id]
 * Get a single cake by ID with the current highest bid.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();

    const rows = await sql`
      SELECT
        c.*,
        COALESCE(b.highest_bid, 0) AS highest_bid
      FROM cakes c
      LEFT JOIN (
        SELECT cake_id, MAX(amount) AS highest_bid
        FROM bids
        GROUP BY cake_id
      ) b ON b.cake_id = c.id
      WHERE c.id = ${id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Cake not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cakes/[id]
 * Update a cake. Requires admin auth.
 * If a new base64 `image` field is provided, it is uploaded to ImgBB.
 */
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

    // If a raw base64 image is provided, upload to ImgBB
    let imgbbUrl = body.imgbb_url;
    if (body.image) {
      const result = await uploadImage(body.image);
      imgbbUrl = result.url;
    }

    const parsed = cakeSchema.parse({ ...body, imgbb_url: imgbbUrl });

    const sql = getDb();
    const rows = await sql`
      UPDATE cakes SET
        auction_id      = ${parsed.auction_id},
        name            = ${parsed.name},
        flavor          = ${parsed.flavor ?? null},
        description     = ${parsed.description ?? null},
        donor_name      = ${parsed.donor_name ?? null},
        beneficiary_kid = ${parsed.beneficiary_kid ?? null},
        imgbb_url       = ${parsed.imgbb_url ?? null},
        starting_price  = ${parsed.starting_price},
        min_increment   = ${parsed.min_increment},
        max_increment   = ${parsed.max_increment},
        sort_order      = ${parsed.sort_order}
      WHERE id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Cake not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
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

/**
 * DELETE /api/cakes/[id]
 * Delete a cake. Requires admin auth.
 */
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

    const rows = await sql`
      DELETE FROM cakes WHERE id = ${id} RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Cake not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
