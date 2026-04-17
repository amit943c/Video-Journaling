import LibraryGrid from '@/components/library/LibraryGrid';

export default function LibraryPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Video Library</h1>
        <p className="text-surface-400 text-sm mt-1">Browse and rewatch your recordings</p>
      </div>
      <LibraryGrid />
    </div>
  );
}
