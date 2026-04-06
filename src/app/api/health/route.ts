import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hasDbUrl = !!process.env.DATABASE_URL;
    const sql = getDb();
    const result = await sql`SELECT NOW() as server_time`;
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      serverTime: result[0].server_time,
      envCheck: hasDbUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        message: error instanceof Error ? error.message : 'Unknown error',
        hasDbUrl: !!process.env.DATABASE_URL,
      },
      { status: 500 }
    );
  }
}
