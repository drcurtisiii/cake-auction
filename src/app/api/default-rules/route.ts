import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-guard';
import { getDefaultRules, saveDefaultRules } from '@/lib/default-rules';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rules = await getDefaultRules();
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch default rules' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rules = Array.isArray(body?.rules) ? body.rules : null;

    if (!rules) {
      return NextResponse.json({ error: 'Rules array is required' }, { status: 400 });
    }

    await saveDefaultRules(rules);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save default rules' },
      { status: 500 },
    );
  }
}
