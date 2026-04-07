import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-guard';
import { cakePickupSchema } from '@/lib/validators';
import { normalizeCake } from '@/lib/cake-normalization';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = cakePickupSchema.parse({
      ...body,
      final_buyer_name: body.final_buyer_name || undefined,
      final_amount_paid:
        body.final_amount_paid === '' || body.final_amount_paid == null
          ? null
          : Number(body.final_amount_paid),
    });

    const sql = getDb();
    const rows = await sql`
      UPDATE cakes
      SET picked_up = ${parsed.picked_up},
          final_buyer_name = ${parsed.final_buyer_name ?? null},
          final_amount_paid = ${parsed.final_amount_paid ?? null}
      WHERE id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Cake not found' }, { status: 404 });
    }

    return NextResponse.json(normalizeCake(rows[0]));
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update pickup details' },
      { status: 500 },
    );
  }
}
