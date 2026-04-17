'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { VideoEntry } from '@/lib/types';
import { formatDate, formatDuration, formatFileSize } from '@/lib/utils';

interface VideoPlayerModalProps {
  video: VideoEntry;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function VideoPlayerModal({ video, onClose, onDeleted }: VideoPlayerModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const fetchSignedUrl = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(video.id)}/signed-url`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load video');
      setVideoUrl(data.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [video.id]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(video.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete');
      onDeleted?.();
      onClose();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [video.id, onDeleted, onClose]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (confirmDelete) setConfirmDelete(false); else onClose(); }
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose, confirmDelete]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-5xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-lg text-surface-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="card overflow-hidden">
          <div className="relative aspect-video bg-black">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <svg className="w-10 h-10 text-accent animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm text-surface-400">Loading video…</span>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <svg className="w-12 h-12 text-danger mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  <p className="text-sm text-surface-400">{error}</p>
                  <button onClick={fetchSignedUrl} className="btn-secondary text-sm">Retry</button>
                </div>
              </div>
            )}

            {videoUrl && !error && (
              <video src={videoUrl} controls autoPlay playsInline className="w-full h-full" poster={video.thumbnailUrl || undefined} />
            )}
          </div>

          <div className="p-5 flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <h2 className="text-lg font-semibold">{video.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-surface-400">
                <span>{formatDate(video.date)}</span>
                {video.durationSeconds && video.durationSeconds > 0 && (
                  <><span className="text-surface-700">·</span><span>{formatDuration(video.durationSeconds)}</span></>
                )}
                {video.sizeBytes && (
                  <><span className="text-surface-700">·</span><span>{formatFileSize(video.sizeBytes)}</span></>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-surface-400">Delete?</span>
                  <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-medium hover:bg-danger/20 transition-colors">
                    {deleting ? 'Deleting…' : 'Yes'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-surface-400 text-sm font-medium hover:bg-white/10 transition-colors">
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 rounded-lg text-surface-500 hover:text-danger hover:bg-danger/10 transition-all"
                  title="Delete video"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
