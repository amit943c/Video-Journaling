'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { getRandomJokeExcluding } from '@/lib/jokes';
import { loadFaceDetection } from '@/lib/face-detection';

interface PhotoCaptureProps {
  onPhotoCaptured: () => void;
}

type Mood = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'fearful' | 'disgusted' | null;

const MOOD_EMOJI: Record<NonNullable<Mood>, string> = {
  happy: '😄',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  neutral: '😐',
  fearful: '😨',
  disgusted: '🤢',
};

const MOOD_LABEL: Record<NonNullable<Mood>, string> = {
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  surprised: 'Surprised',
  neutral: 'Neutral',
  fearful: 'Fearful',
  disgusted: 'Disgusted',
};

export default function PhotoCapture({ onPhotoCaptured }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const faceapiRef = useRef<any>(null);
  const lastJokeRef = useRef('');

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [mirrored, setMirrored] = useState(true);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [mood, setMood] = useState<Mood>(null);
  const [joke, setJoke] = useState<string | null>(null);
  const [jokeVisible, setJokeVisible] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const loadFaceModels = useCallback(async () => {
    if (faceapiRef.current) return faceapiRef.current;
    try {
      const faceapi = await loadFaceDetection();
      faceapiRef.current = faceapi;
      setModelsLoaded(true);
      return faceapi;
    } catch {
      return null;
    }
  }, []);

  const startDetectionLoop = useCallback(async () => {
    const faceapi = await loadFaceModels();
    if (!faceapi || !videoRef.current) return;

    const detect = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      try {
        const result = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
          .withFaceExpressions();

        if (result) {
          const expressions = result.expressions;
          const sorted = Object.entries(expressions).sort(
            (a, b) => (b[1] as number) - (a[1] as number),
          );
          const [topExpression] = sorted[0];
          const mappedMood = topExpression as Mood;
          setMood(mappedMood);

          if (mappedMood === 'sad') {
            const newJoke = getRandomJokeExcluding(lastJokeRef.current);
            lastJokeRef.current = newJoke;
            setJoke(newJoke);
            setJokeVisible(true);
          } else if (mappedMood === 'happy') {
            setJokeVisible(false);
          }
        } else {
          setMood(null);
        }
      } catch {
        // detection failed silently, will retry
      }

      detectionLoopRef.current = window.setTimeout(detect, 800);
    };

    // small delay for the video to settle
    detectionLoopRef.current = window.setTimeout(detect, 1500);
  }, [loadFaceModels]);

  const stopDetectionLoop = useCallback(() => {
    if (detectionLoopRef.current) {
      clearTimeout(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setMood(null);
      setJoke(null);
      setJokeVisible(false);
    } catch {
      setCameraError('Could not access camera. Please grant permission and try again.');
    }
  }, []);

  useEffect(() => {
    if (cameraActive) {
      startDetectionLoop();
    }
    return () => stopDetectionLoop();
  }, [cameraActive, startDetectionLoop, stopDetectionLoop]);

  const stopCamera = useCallback(() => {
    stopDetectionLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setMood(null);
    setJokeVisible(false);
  }, [stopDetectionLoop]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        stopCamera();
      },
      'image/jpeg',
      0.92,
    );
  }, [mirrored, stopCamera]);

  const discardPhoto = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setTitle('');
    setUploadDone(false);
  }, [capturedUrl]);

  const uploadPhoto = useCallback(async () => {
    if (!capturedBlob) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', capturedBlob, 'photo.jpg');
      formData.append('title', title || 'Selfie');

      const res = await fetch('/api/photos/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');

      setUploadDone(true);
      onPhotoCaptured();
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [capturedBlob, title, onPhotoCaptured]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [stopCamera, capturedUrl]);

  if (capturedUrl) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/[0.06]">
          <img src={capturedUrl} alt="Captured" className="w-full h-full object-contain" />
        </div>

        <div>
          <label htmlFor="photo-title" className="block text-sm font-medium text-surface-300 mb-2">
            Title (optional)
          </label>
          <input
            id="photo-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="e.g. Day 1, Morning selfie…"
          />
        </div>

        {uploadDone ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
            <svg className="w-5 h-5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="text-sm text-success font-medium">Photo saved</span>
          </div>
        ) : null}

        <div className="flex gap-3">
          <button onClick={discardPhoto} className="btn-secondary flex-1" disabled={uploading}>
            {uploadDone ? 'Take Another' : 'Discard'}
          </button>
          {!uploadDone && (
            <button onClick={uploadPhoto} className="btn-primary flex-1" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Save Photo'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] bg-surface-900 rounded-2xl overflow-hidden border border-white/[0.06]">
        {!cameraActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            </div>
            <p className="text-surface-300 font-medium">Ready to capture</p>
            <p className="text-surface-500 text-sm">Position your face and align your eyes to the guide</p>
            {cameraError && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-2">{cameraError}</p>
            )}
          </div>
        ) : null}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'} ${mirrored ? '-scale-x-100' : ''}`}
        />

        {/* Eye alignment guide */}
        {cameraActive && showGuide && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-accent/50"
              style={{ top: '38%' }}
            />
            <div className="absolute flex gap-[22%] justify-center w-full" style={{ top: 'calc(38% - 8px)' }}>
              <div className="w-4 h-4 rounded-full border-2 border-accent/60" />
              <div className="w-4 h-4 rounded-full border-2 border-accent/60" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 text-[10px] text-accent/70 font-medium tracking-wider uppercase" style={{ top: 'calc(38% + 6px)' }}>
              align eyes
            </div>
          </div>
        )}

        {/* Mood badge */}
        {cameraActive && mood && (
          <div className="absolute bottom-4 left-4 animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-sm">
              <span className="text-base">{MOOD_EMOJI[mood]}</span>
              <span className="text-white/80 font-medium">{MOOD_LABEL[mood]}</span>
            </div>
          </div>
        )}

        {/* Joke toast when sad */}
        {cameraActive && jokeVisible && joke && (
          <div className="absolute bottom-16 left-4 right-4 animate-slide-up">
            <div className="relative p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md border border-amber-400/20">
              <button
                onClick={() => setJokeVisible(false)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white/80"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="text-sm text-white/90 leading-relaxed pr-6">
                <span className="text-base mr-1.5">😄</span>
                {joke}
              </p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        {cameraActive && (
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setShowGuide((g) => !g)}
              title={showGuide ? 'Hide guide' : 'Show guide'}
              className={`p-2.5 rounded-xl backdrop-blur-sm border transition-all ${showGuide ? 'bg-accent/20 border-accent/30 text-accent' : 'bg-black/40 border-white/10 text-white/80 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
            <button
              onClick={() => setMirrored((m) => !m)}
              title={mirrored ? 'Disable mirror' : 'Enable mirror'}
              className="relative p-2.5 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-white/80 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              {mirrored && <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface-900" />}
            </button>
          </div>
        )}

        {/* Loading models indicator */}
        {cameraActive && !modelsLoaded && (
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-xs text-white/60">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading mood detection…
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3">
        {!cameraActive ? (
          <button onClick={startCamera} className="btn-primary px-8 py-3 text-base">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            Open Camera
          </button>
        ) : (
          <>
            <button onClick={stopCamera} className="btn-secondary">Cancel</button>
            <button onClick={capturePhoto} className="btn-primary px-8 py-3 text-base">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
              </svg>
              Capture
            </button>
          </>
        )}
      </div>
    </div>
  );
}
