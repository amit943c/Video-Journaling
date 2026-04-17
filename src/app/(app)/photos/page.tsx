'use client';

import { useState, useEffect, useCallback } from 'react';
import { PhotoEntry } from '@/lib/types';
import PhotoGallery from '@/components/photos/PhotoGallery';
import TimeLapseGenerator from '@/components/photos/TimeLapseGenerator';

type Tab = 'gallery' | 'timelapse';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'gallery',
    label: 'Gallery',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
      </svg>
    ),
  },
  {
    id: 'timelapse',
    label: 'Time Lapse',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    ),
  },
];

export default function PhotoLibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('gallery');
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/photos');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load photos');
      setPhotos(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Photo Library</h1>
        <p className="text-surface-400 text-sm mt-1">Browse your photos and create a &ldquo;You Through Time&rdquo; video</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-surface-900/60 border border-white/[0.06] mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              activeTab === tab.id
                ? 'bg-accent/10 text-accent border-accent/20'
                : 'text-surface-400 border-transparent hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl">
        {activeTab === 'gallery' && (
          <PhotoGallery photos={photos} loading={loading} error={error} onRetry={fetchPhotos} onRefresh={fetchPhotos} />
        )}
        {activeTab === 'timelapse' && (
          <TimeLapseGenerator photos={photos} />
        )}
      </div>
    </div>
  );
}
