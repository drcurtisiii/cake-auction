import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { uploadImage } from '@/lib/imgbb';
import { cakeSchema } from '@/lib/validators';
import { isCakeRegistrationOpen } from '@/lib/cake-registration';
import type { Auction } from '@/types';

export const dynamic = 'force-dynamic';

const cakeRegistrationSchema = cakeSchema
  .pick({
    auction_id: true,
    name: true,
    flavor: true,
    description: true,
    donor_name: true,
    submitter_email: true,
    submitter_phone: true,
    beneficiary_kid: true,
    starting_price: true,
    min_increment: true,
    max_increment: true,
  })
  .extend({
    donor_name: cakeSchema.shape.donor_name.unwrap().min(1, 'Your name is required'),
    submitter_email: cakeSchema.shape.submitter_email.unwrap(),
  });

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT *
      FROM auctions
      WHERE status = 'published'
      ORDER BY live_at ASC NULLS LAST, created_at DESC
    `;

    const auctions = (rows as Auction[]).filter(isCakeRegistrationOpen);
    return NextResponse.json(auctions);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch registration auctions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.image || typeof body.image !== 'string') {
      return NextResponse.json(
        { error: 'Cake image is required' },
        { status: 400 }
      );
    }

    const parsed = cakeRegistrationSchema.parse(body);

    const sql = getDb();
    const auctionRows = await sql`
      SELECT *
      FROM auctions
      WHERE id = ${parsed.auction_id}
      LIMIT 1
    `;

    if (auctionRows.length === 0) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    const auction = auctionRows[0] as Auction;
    if (!isCakeRegistrationOpen(auction)) {
      return NextResponse.json(
        { error: 'Cake registration is closed for this auction' },
        { status: 400 }
      );
    }

    const image = await uploadImage(body.image);
    const maxSortRows = await sql`
      SELECT COALESCE(MAX(sort_order), -1) AS max_sort_order
      FROM cakes
      WHERE auction_id = ${parsed.auction_id}
    `;
    const nextSortOrder = Number(maxSortRows[0]?.max_sort_order ?? -1) + 1;

    const rows = await sql`
      INSERT INTO cakes (
        auction_id, name, flavor, description,
        donor_name, submitter_email, submitter_phone, beneficiary_kid, imgbb_url,
        approval_status, starting_price, min_increment, max_increment, sort_order
      ) VALUES (
        ${parsed.auction_id},
        ${parsed.name},
        ${parsed.flavor ?? null},
        ${parsed.description ?? null},
        ${parsed.donor_name ?? null},
        ${parsed.submitter_email ?? null},
        ${parsed.submitter_phone ?? null},
        ${parsed.beneficiary_kid ?? null},
        ${image.url},
        'pending',
        ${parsed.starting_price ?? 0},
        ${parsed.min_increment ?? 5},
        ${parsed.max_increment ?? 25},
        ${nextSortOrder}
      )
      RETURNING id, name
    `;

    return NextResponse.json(
      {
        success: true,
        id: rows[0].id,
        name: rows[0].name,
        message: 'Cake submitted for review.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit cake registration' },
      { status: 500 }
    );
  }
}
