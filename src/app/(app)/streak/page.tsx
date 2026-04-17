import StreakDashboard from '@/components/streak/StreakDashboard';

export default function StreakPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Streak</h1>
        <p className="text-surface-400 text-sm mt-1">Track your recording consistency</p>
      </div>
      <StreakDashboard />
    </div>
  );
}
