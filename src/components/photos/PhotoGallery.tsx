'use client';

import { useState } from 'react';
import { PhotoEntry } from '@/lib/types';
import PhotoCard from './PhotoCard';
import PhotoViewerModal from './PhotoViewerModal';

interface PhotoGalleryProps {
  photos: PhotoEntry[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onRefresh?: () => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export default function PhotoGallery({
  photos, loading, error, onRetry, onRefresh,
  selectable, selectedIds, onSelectionChange,
}: PhotoGalleryProps) {
  const [viewingPhoto, setViewingPhoto] = useState<PhotoEntry | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="aspect-[3/4] bg-surface-800" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-surface-800 rounded w-3/4" />
              <div className="h-2 bg-surface-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-surface-400">{error}</p>
        <button onClick={onRetry} className="btn-secondary">Try Again</button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-surface-900 border border-white/[0.06] flex items-center justify-center">
          <svg className="w-10 h-10 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
          </svg>
        </div>
        <p className="text-surface-300 font-medium">No photos yet</p>
        <p className="text-surface-500 text-sm">Go to Record to take your first photo</p>
      </div>
    );
  }

  function toggleSelection(id: string, selected: boolean) {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (selected) next.add(id); else next.delete(id);
    onSelectionChange(next);
  }

  return (
    <>
      <p className="text-sm text-surface-500 mb-4">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onClick={() => setViewingPhoto(photo)}
            selectable={selectable}
            selected={selectedIds?.has(photo.id)}
            onSelect={(sel) => toggleSelection(photo.id, sel)}
          />
        ))}
      </div>

      {viewingPhoto && (
        <PhotoViewerModal
          photo={viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          onDeleted={() => { setViewingPhoto(null); onRefresh?.(); }}
        />
      )}
    </>
  );
}
