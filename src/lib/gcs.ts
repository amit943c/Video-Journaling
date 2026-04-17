import { Storage } from '@google-cloud/storage';
import { VideoEntry, PhotoEntry, SignedUrlResult } from './types';

let storageInstance: Storage | null = null;

function getStorage(): Storage {
  if (storageInstance) return storageInstance;

  const projectId = process.env.GCP_PROJECT_ID;
  const clientEmail = process.env.GCP_CLIENT_EMAIL;
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('GCP credentials not configured. Set GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY.');
  }

  storageInstance = new Storage({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
  return storageInstance;
}

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new Error('GCS_BUCKET_NAME env var is required');
  return getStorage().bucket(bucketName);
}

function userPrefix(userEmail: string, category: string): string {
  return `${userEmail}/${category}/`;
}

export function buildVideoPath(userEmail: string, date: Date, slug: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const ts = date.getTime();
  return `${userEmail}/videos/${y}/${m}/${d}/${ts}_${slug}.webm`;
}

export function buildThumbnailPath(userEmail: string, date: Date, slug: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const ts = date.getTime();
  return `${userEmail}/thumbnails/${y}/${m}/${d}/${ts}_${slug}.jpg`;
}

export function buildPhotoPath(userEmail: string, date: Date, slug: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const ts = date.getTime();
  return `${userEmail}/photos/${y}/${m}/${d}/${ts}_${slug}.jpg`;
}

export function buildTranscriptPath(userEmail: string, date: Date, slug: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const ts = date.getTime();
  return `${userEmail}/transcripts/${y}/${m}/${d}/${ts}_${slug}.json`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled';
}

export async function uploadVideo(
  buffer: Buffer,
  gcsPath: string,
  contentType: string,
  metadata: Record<string, string>,
): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(gcsPath);
  await file.save(buffer, {
    contentType,
    metadata: { metadata },
    resumable: false,
  });
}

export async function uploadThumbnail(
  buffer: Buffer,
  gcsPath: string,
): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(gcsPath);
  await file.save(buffer, {
    contentType: 'image/jpeg',
    resumable: false,
  });
}

export async function getSignedUrl(
  gcsPath: string,
  expiresInMinutes = 60,
): Promise<SignedUrlResult> {
  const bucket = getBucket();
  const file = bucket.file(gcsPath);
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAt,
  });

  return { url, expiresAt };
}

export async function getSignedUploadUrl(
  gcsPath: string,
  contentType: string,
  expiresInMinutes = 30,
): Promise<SignedUrlResult> {
  const bucket = getBucket();
  const file = bucket.file(gcsPath);
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresAt,
    contentType,
  });

  return { url, expiresAt };
}

function parseVideoPath(name: string): Omit<VideoEntry, 'thumbnailUrl' | 'videoUrl'> | null {
  const match = name.match(/^[^/]+\/videos\/(\d{4})\/(\d{2})\/(\d{2})\/(\d+)_(.+)\.(webm|mp4)$/);
  if (!match) return null;

  const [, year, month, day, tsStr, slug, ext] = match;
  const timestamp = parseInt(tsStr, 10);
  const date = new Date(timestamp);

  const titleFromSlug = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: `${timestamp}_${slug}`,
    title: titleFromSlug,
    slug,
    filename: `${timestamp}_${slug}.${ext}`,
    date: date.toISOString(),
    year,
    month,
    day,
    timestamp,
    contentType: ext === 'mp4' ? 'video/mp4' : 'video/webm',
    hasTranscript: false,
  };
}

export async function listVideos(userEmail: string): Promise<VideoEntry[]> {
  const bucket = getBucket();

  const [videoFiles] = await bucket.getFiles({ prefix: userPrefix(userEmail, 'videos') });
  const [thumbnailFiles] = await bucket.getFiles({ prefix: userPrefix(userEmail, 'thumbnails') });
  const [transcriptFiles] = await bucket.getFiles({ prefix: userPrefix(userEmail, 'transcripts') });

  const thumbnailSet = new Set(thumbnailFiles.map((f) => f.name));
  const transcriptSet = new Set(transcriptFiles.map((f) => f.name));

  const entries: VideoEntry[] = [];

  for (const file of videoFiles) {
    const entry = parseVideoPath(file.name);
    if (!entry) continue;

    const thumbPath = file.name
      .replace(/\/videos\//, '/thumbnails/')
      .replace(/\.(webm|mp4)$/, '.jpg');

    entry.hasTranscript = transcriptSet.has(
      file.name.replace(/\/videos\//, '/transcripts/').replace(/\.(webm|mp4)$/, '.json'),
    );

    const meta = file.metadata;
    if (meta?.metadata?.title) {
      entry.title = String(meta.metadata.title);
    }
    if (meta?.metadata?.durationSeconds) {
      entry.durationSeconds = parseFloat(String(meta.metadata.durationSeconds));
    }
    if (meta?.size) {
      entry.sizeBytes = parseInt(String(meta.size), 10);
    }

    const hasThumbnail = thumbnailSet.has(thumbPath);

    entries.push({
      ...entry,
      thumbnailUrl: hasThumbnail ? thumbPath : null,
    });
  }

  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries;
}

export async function getVideoEntry(userEmail: string, id: string): Promise<VideoEntry | null> {
  const videos = await listVideos(userEmail);
  return videos.find((v) => v.id === id) ?? null;
}

export async function getVideoGcsPath(userEmail: string, id: string): Promise<string | null> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix: userPrefix(userEmail, 'videos') });

  for (const file of files) {
    const match = file.name.match(/(\d+_.+)\.(webm|mp4)$/);
    if (match && match[1] === id) {
      return file.name;
    }
  }
  return null;
}

export async function uploadPhoto(
  buffer: Buffer,
  gcsPath: string,
  metadata: Record<string, string>,
): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(gcsPath);
  await file.save(buffer, {
    contentType: 'image/jpeg',
    metadata: { metadata },
    resumable: false,
  });
}

function parsePhotoPath(name: string): Omit<PhotoEntry, 'imageUrl'> | null {
  const match = name.match(/^[^/]+\/photos\/(\d{4})\/(\d{2})\/(\d{2})\/(\d+)_(.+)\.jpg$/);
  if (!match) return null;

  const [, year, month, day, tsStr, slug] = match;
  const timestamp = parseInt(tsStr, 10);
  const date = new Date(timestamp);

  const titleFromSlug = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: `${timestamp}_${slug}`,
    title: titleFromSlug,
    slug,
    filename: `${timestamp}_${slug}.jpg`,
    date: date.toISOString(),
    year,
    month,
    day,
    timestamp,
  };
}

export async function listPhotos(userEmail: string): Promise<PhotoEntry[]> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix: userPrefix(userEmail, 'photos') });

  const entries: PhotoEntry[] = [];

  for (const file of files) {
    const entry = parsePhotoPath(file.name);
    if (!entry) continue;

    const meta = file.metadata;
    if (meta?.metadata?.title) {
      entry.title = String(meta.metadata.title);
    }
    if (meta?.size) {
      entry.sizeBytes = parseInt(String(meta.size), 10);
    }

    entries.push({ ...entry, imageUrl: file.name });
  }

  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries;
}

export async function getPhotoGcsPath(userEmail: string, id: string): Promise<string | null> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix: userPrefix(userEmail, 'photos') });

  for (const file of files) {
    const match = file.name.match(/(\d+_.+)\.jpg$/);
    if (match && match[1] === id) {
      return file.name;
    }
  }
  return null;
}

export async function deleteVideo(userEmail: string, id: string): Promise<boolean> {
  const bucket = getBucket();
  const videoPath = await getVideoGcsPath(userEmail, id);
  if (!videoPath) return false;

  const thumbPath = videoPath
    .replace(/\/videos\//, '/thumbnails/')
    .replace(/\.(webm|mp4)$/, '.jpg');
  const transcriptPath = videoPath
    .replace(/\/videos\//, '/transcripts/')
    .replace(/\.(webm|mp4)$/, '.json');

  await bucket.file(videoPath).delete().catch(() => {});
  await bucket.file(thumbPath).delete().catch(() => {});
  await bucket.file(transcriptPath).delete().catch(() => {});

  return true;
}

export async function deletePhoto(userEmail: string, id: string): Promise<boolean> {
  const photoPath = await getPhotoGcsPath(userEmail, id);
  if (!photoPath) return false;

  const bucket = getBucket();
  await bucket.file(photoPath).delete();
  return true;
}

export async function getUploadDates(userEmail: string): Promise<string[]> {
  const bucket = getBucket();
  const [files] = await bucket.getFiles({ prefix: userPrefix(userEmail, 'videos') });

  const dateSet = new Set<string>();

  for (const file of files) {
    const match = file.name.match(/\/videos\/(\d{4})\/(\d{2})\/(\d{2})\//);
    if (match) {
      dateSet.add(`${match[1]}-${match[2]}-${match[3]}`);
    }
  }

  return Array.from(dateSet).sort().reverse();
}
