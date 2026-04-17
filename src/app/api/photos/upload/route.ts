import { NextRequest, NextResponse } from 'next/server';
import { uploadPhoto, buildPhotoPath, slugify } from '@/lib/gcs';
import { getSessionEmail } from '@/lib/auth';
import type { ApiResponse, UploadResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const email = await getSessionEmail(request);

    const formData = await request.formData();
    const photoFile = formData.get('photo') as File | null;
    const title = (formData.get('title') as string) || 'Selfie';

    if (!photoFile) {
      return NextResponse.json(
        { success: false, error: 'No photo provided' } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const now = new Date();
    const slug = slugify(title);
    const photoPath = buildPhotoPath(email, now, slug);

    const buffer = Buffer.from(await photoFile.arrayBuffer());
    await uploadPhoto(buffer, photoPath, { title });

    return NextResponse.json({
      success: true,
      data: { success: true, photoPath },
    } satisfies ApiResponse<UploadResult>);
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
