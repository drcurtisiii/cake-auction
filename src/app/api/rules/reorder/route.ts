import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const { authenticated } = await verifyAdmin(request);
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rules } = body as {
      rules: Array<{ id: string; sort_order: number }>;
    };

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json(
        { error: 'rules array is required' },
        { status: 400 }
      );
    }

    const sql = getDb();

    for (const rule of rules) {
      await sql`
        UPDATE rules
        SET sort_order = ${rule.sort_order}, updated_at = NOW()
        WHERE id = ${rule.id}
      `;
    }

    // Return the updated rules in new order
    const ids = rules.map((r) => r.id);
    const updated = await sql`
      SELECT * FROM rules
      WHERE id = ANY(${ids})
      ORDER BY sort_order ASC
    `;

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error reordering rules:', error);
    return NextResponse.json(
      { error: 'Failed to reorder rules' },
      { status: 500 }
    );
  }
}
