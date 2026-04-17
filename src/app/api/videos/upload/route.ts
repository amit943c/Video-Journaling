import { NextRequest, NextResponse } from 'next/server';
import { uploadVideo, uploadThumbnail, buildVideoPath, buildThumbnailPath, slugify } from '@/lib/gcs';
import { getSessionEmail } from '@/lib/auth';
import type { ApiResponse, UploadResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const email = await getSessionEmail(request);

    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const title = (formData.get('title') as string) || 'Untitled';
    const durationStr = formData.get('duration') as string | null;

    if (!videoFile) {
      return NextResponse.json(
        { success: false, error: 'No video file provided' } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const now = new Date();
    const slug = slugify(title);
    const videoPath = buildVideoPath(email, now, slug);

    const metadata: Record<string, string> = { title };
    if (durationStr) metadata.durationSeconds = durationStr;

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    await uploadVideo(videoBuffer, videoPath, videoFile.type || 'video/webm', metadata);

    let thumbnailPath: string | undefined;
    if (thumbnailFile) {
      thumbnailPath = buildThumbnailPath(email, now, slug);
      const thumbBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      await uploadThumbnail(thumbBuffer, thumbnailPath);
    }

    return NextResponse.json({
      success: true,
      data: { success: true, videoPath, thumbnailPath },
    } satisfies ApiResponse<UploadResult>);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
