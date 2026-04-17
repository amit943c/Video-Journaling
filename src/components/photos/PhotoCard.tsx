'use client';

import { PhotoEntry } from '@/lib/types';
import { formatRelativeDate } from '@/lib/utils';

interface PhotoCardProps {
  photo: PhotoEntry;
  onClick: () => void;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (selected: boolean) => void;
}

export default function PhotoCard({ photo, onClick, selected, selectable, onSelect }: PhotoCardProps) {
  return (
    <div className="card-interactive group relative">
      {selectable && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect?.(!selected); }}
          className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            selected ? 'bg-accent border-accent' : 'border-white/40 bg-black/30 backdrop-blur-sm'
          }`}
        >
          {selected && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </button>
      )}

      <button onClick={onClick} className="w-full text-left">
        <div className="relative aspect-[3/4] bg-surface-800 overflow-hidden">
          {photo.imageUrl ? (
            <img
              src={photo.imageUrl}
              alt={photo.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-10 h-10 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-3 space-y-0.5">
          <h3 className="font-medium text-sm truncate group-hover:text-accent transition-colors">{photo.title}</h3>
          <p className="text-xs text-surface-500">{formatRelativeDate(photo.date)}</p>
        </div>
      </button>
    </div>
  );
}
