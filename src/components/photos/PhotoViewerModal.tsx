'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PhotoEntry } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface PhotoViewerModalProps {
  photo: PhotoEntry;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function PhotoViewerModal({ photo, onClose, onDeleted }: PhotoViewerModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(photo.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete');
      onDeleted?.();
      onClose();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [photo.id, onDeleted, onClose]);

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

      <div className="relative z-10 w-full max-w-4xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-lg text-surface-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="card overflow-hidden">
          <div className="bg-black flex items-center justify-center" style={{ maxHeight: '75vh' }}>
            {photo.imageUrl ? (
              <img src={photo.imageUrl} alt={photo.title} className="max-w-full max-h-[75vh] object-contain" />
            ) : (
              <div className="p-20 text-surface-500">Image not available</div>
            )}
          </div>

          <div className="p-5 flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h2 className="text-lg font-semibold">{photo.title}</h2>
              <p className="text-sm text-surface-400">{formatDate(photo.date)}</p>
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
                  title="Delete photo"
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
