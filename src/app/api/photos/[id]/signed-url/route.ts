import { NextRequest, NextResponse } from 'next/server';
import { getPhotoGcsPath, getSignedUrl } from '@/lib/gcs';
import { getSessionEmail } from '@/lib/auth';
import type { ApiResponse, SignedUrlResult } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const email = await getSessionEmail(request);
    const photoId = decodeURIComponent(params.id);
    const gcsPath = await getPhotoGcsPath(email, photoId);

    if (!gcsPath) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' } satisfies ApiResponse,
        { status: 404 },
      );
    }

    const result = await getSignedUrl(gcsPath, 120);

    return NextResponse.json({
      success: true,
      data: result,
    } satisfies ApiResponse<SignedUrlResult>);
  } catch (error) {
    console.error('Photo signed URL error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate signed URL' } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
