import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-guard';
import { ruleSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auctionId = request.nextUrl.searchParams.get('auctionId');
    if (!auctionId) {
      return NextResponse.json(
        { error: 'auctionId query parameter is required' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const rules = await sql`
      SELECT * FROM rules
      WHERE auction_id = ${auctionId}
      ORDER BY sort_order ASC
    `;

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authenticated } = await verifyAdmin(request);
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = ruleSchema.parse(body);

    const sql = getDb();
    const [rule] = await sql`
      INSERT INTO rules (auction_id, rule_text, sort_order)
      VALUES (${parsed.auction_id}, ${parsed.rule_text}, ${parsed.sort_order})
      RETURNING *
    `;

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}
