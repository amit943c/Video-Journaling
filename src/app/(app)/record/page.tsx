import Recorder from '@/components/record/Recorder';

export default function RecordPage() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Record</h1>
        <p className="text-surface-400 text-sm mt-1">Record a video or take a photo — all from the same camera</p>
      </div>
      <Recorder />
    </div>
  );
}
