import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);

  return NextResponse.json({
    authenticated: admin.authenticated,
    deviceToken: admin.deviceToken ?? null,
  });
}
