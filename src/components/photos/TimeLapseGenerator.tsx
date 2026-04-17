'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PhotoEntry, EyePositions } from '@/lib/types';
import { loadFaceLandmarks } from '@/lib/face-detection';

type GeneratorState = 'idle' | 'loading-models' | 'processing' | 'done' | 'error';

interface TimeLapseGeneratorProps {
  photos: PhotoEntry[];
}

export default function TimeLapseGenerator({ photos }: TimeLapseGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faceapiRef = useRef<any>(null);

  const [state, setState] = useState<GeneratorState>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [frameDuration, setFrameDuration] = useState(250);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const chronological = [...photos].sort((a, b) => a.timestamp - b.timestamp);

  const loadModels = useCallback(async () => {
    if (faceapiRef.current) return faceapiRef.current;
    const faceapi = await loadFaceLandmarks();
    faceapiRef.current = faceapi;
    return faceapi;
  }, []);

  const detectEyes = useCallback(async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    faceapi: any,
    img: HTMLImageElement,
  ): Promise<EyePositions | null> => {
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
      .withFaceLandmarks(true);

    if (!detection) return null;

    const landmarks = detection.landmarks;
    const leftEyePts = landmarks.getLeftEye();
    const rightEyePts = landmarks.getRightEye();

    const avg = (pts: { x: number; y: number }[]) => ({
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    });

    const leftEye = avg(leftEyePts);
    const rightEye = avg(rightEyePts);
    const midpoint = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
    const distance = Math.sqrt((rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2);

    return { leftEye, rightEye, midpoint, distance };
  }, []);

  const loadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = url;
    });
  }, []);

  const drawAlignedFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    eyes: EyePositions,
    refEyes: EyePositions,
    canvasW: number,
    canvasH: number,
  ) => {
    const scale = refEyes.distance / eyes.distance;
    const angle = Math.atan2(
      eyes.rightEye.y - eyes.leftEye.y,
      eyes.rightEye.x - eyes.leftEye.x,
    );
    const refAngle = Math.atan2(
      refEyes.rightEye.y - refEyes.leftEye.y,
      refEyes.rightEye.x - refEyes.leftEye.x,
    );

    ctx.save();
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.translate(refEyes.midpoint.x, refEyes.midpoint.y);
    ctx.rotate(-(angle - refAngle));
    ctx.scale(scale, scale);
    ctx.translate(-eyes.midpoint.x, -eyes.midpoint.y);

    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }, []);

  const generate = useCallback(async () => {
    if (chronological.length < 2) return;

    setState('loading-models');
    setProgress({ current: 0, total: chronological.length, phase: 'Loading face detection…' });
    setSkippedCount(0);
    setErrorMsg('');

    try {
      const faceapi = await loadModels();
      setState('processing');

      setProgress({ current: 1, total: chronological.length, phase: 'Loading first photo as reference…' });

      const firstImg = await loadImage(`/api/photos/${encodeURIComponent(chronological[0].id)}/image`);
      const refEyes = await detectEyes(faceapi, firstImg);

      const canvasW = firstImg.width;
      const canvasH = firstImg.height;

      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const recorderReady = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start();

      let skipped = 0;

      ctx.drawImage(firstImg, 0, 0);
      await new Promise((r) => setTimeout(r, frameDuration));

      for (let i = 1; i < chronological.length; i++) {
        const photo = chronological[i];
        setProgress({ current: i + 1, total: chronological.length, phase: `Processing photo ${i + 1}/${chronological.length}` });

        try {
          const imgUrl = `/api/photos/${encodeURIComponent(photo.id)}/image`;
          const img = await loadImage(imgUrl);
          const eyes = await detectEyes(faceapi, img);

          if (eyes && refEyes) {
            drawAlignedFrame(ctx, img, eyes, refEyes, canvasW, canvasH);
          } else {
            skipped++;
            ctx.clearRect(0, 0, canvasW, canvasH);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvasW, canvasH);
            const scaleX = canvasW / img.width;
            const scaleY = canvasH / img.height;
            const s = Math.max(scaleX, scaleY);
            ctx.drawImage(
              img,
              (canvasW - img.width * s) / 2,
              (canvasH - img.height * s) / 2,
              img.width * s,
              img.height * s,
            );
          }

          await new Promise((r) => setTimeout(r, frameDuration));
        } catch {
          skipped++;
        }
      }

      recorder.stop();
      const blob = await recorderReady;

      setSkippedCount(skipped);
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed');
      setState('error');
    }
  }, [chronological, frameDuration, loadModels, detectEyes, loadImage, drawAlignedFrame]);

  const downloadVideo = useCallback(() => {
    if (!resultBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `you-through-time-${Date.now()}.webm`;
    a.click();
  }, [resultBlob]);

  const reset = useCallback(() => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultBlob(null);
    setResultUrl(null);
    setState('idle');
    setSkippedCount(0);
  }, [resultUrl]);

  useEffect(() => {
    if (resultUrl && previewRef.current) {
      previewRef.current.src = resultUrl;
    }
  }, [resultUrl]);

  useEffect(() => {
    return () => { if (resultUrl) URL.revokeObjectURL(resultUrl); };
  }, [resultUrl]);

  if (chronological.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-surface-900 border border-white/[0.06] flex items-center justify-center">
          <svg className="w-10 h-10 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 12 6 12.504 6 13.125" />
          </svg>
        </div>
        <p className="text-surface-300 font-medium">Need at least 2 photos</p>
        <p className="text-surface-500 text-sm">Take more selfies to create your time lapse</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />

      {state === 'idle' && (
        <>
          <div className="card p-6 bg-gradient-to-br from-accent/10 via-surface-900/60 to-surface-900/60 border-accent/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">You Through Time</p>
                <p className="text-sm text-surface-400 mt-1">
                  Creates a video from your {chronological.length} photos with your eyes locked in place
                  so the background and face evolve while the gaze stays fixed.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Frame duration: {frameDuration}ms ({(1000 / frameDuration).toFixed(1)} fps)
              </label>
              <input
                type="range"
                min={80}
                max={1000}
                step={10}
                value={frameDuration}
                onChange={(e) => setFrameDuration(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-surface-500 mt-1">
                <span>Fast</span>
                <span>Slow</span>
              </div>
            </div>

            <button onClick={generate} className="btn-primary w-full py-3">
              Generate Time Lapse ({chronological.length} photos)
            </button>
          </div>
        </>
      )}

      {(state === 'loading-models' || state === 'processing') && (
        <div className="card p-8 space-y-4">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-medium">{progress.phase}</span>
          </div>
          {progress.total > 0 && (
            <div className="space-y-2">
              <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-surface-500 text-right">{progress.current} / {progress.total}</p>
            </div>
          )}
        </div>
      )}

      {state === 'done' && resultUrl && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <video
              ref={previewRef}
              controls
              loop
              playsInline
              autoPlay
              className="w-full aspect-[4/3] bg-black"
            />
          </div>

          {skippedCount > 0 && (
            <p className="text-sm text-warning">
              {skippedCount} photo{skippedCount !== 1 ? 's' : ''} skipped (no face detected)
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary flex-1">Start Over</button>
            <button onClick={downloadVideo} className="btn-primary flex-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Video
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3 text-danger">
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span className="font-medium">{errorMsg || 'Something went wrong'}</span>
          </div>
          <button onClick={reset} className="btn-secondary">Try Again</button>
        </div>
      )}
    </div>
  );
}
