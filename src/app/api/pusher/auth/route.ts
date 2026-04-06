import { NextRequest, NextResponse } from 'next/server';
import { pusher } from '@/lib/pusher-server';
import { verifyAdmin } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { authenticated } = await verifyAdmin(request);

  if (!authenticated) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  const body = await request.formData();
  const socketId = body.get('socket_id') as string;
  const channelName = body.get('channel_name') as string;

  const authResponse = pusher.authorizeChannel(socketId, channelName);

  return NextResponse.json(authResponse);
}
