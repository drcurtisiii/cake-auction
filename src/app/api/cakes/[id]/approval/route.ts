import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

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
    const approvalStatus = body?.approval_status;

    if (approvalStatus !== 'approved') {
      return NextResponse.json(
        { error: 'Only approval is supported on this endpoint' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const rows = await sql`
      UPDATE cakes
      SET approval_status = 'approved',
          approved_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Cake not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve cake' },
      { status: 500 }
    );
  }
}
