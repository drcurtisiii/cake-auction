import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-guard';
import { uploadImage } from '@/lib/imgbb';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Standalone image upload endpoint for the admin UI.
 * Accepts { image: string (base64) } and returns { url: string }.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.image || typeof body.image !== 'string') {
      return NextResponse.json(
        { error: 'A base64-encoded image string is required in the "image" field' },
        { status: 400 }
      );
    }

    const result = await uploadImage(body.image);

    return NextResponse.json({ url: result.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
