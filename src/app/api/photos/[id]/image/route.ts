import { NextRequest, NextResponse } from 'next/server';
import { getPhotoGcsPath, getSignedUrl } from '@/lib/gcs';
import { getSessionEmail } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const email = await getSessionEmail(request);
    const photoId = decodeURIComponent(params.id);
    const gcsPath = await getPhotoGcsPath(email, photoId);

    if (!gcsPath) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const { url } = await getSignedUrl(gcsPath, 5);
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Photo image proxy error:', error);
    return NextResponse.json({ error: 'Failed to load photo' }, { status: 500 });
  }
}
