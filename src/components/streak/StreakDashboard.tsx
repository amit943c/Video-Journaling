'use client';

import { useState, useEffect } from 'react';
import { StreakData } from '@/lib/types';
import ActivityCalendar from './ActivityCalendar';

export default function StreakDashboard() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStreak();
  }, []);

  async function fetchStreak() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/streak');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load streak');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load streak data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-4 bg-surface-800 rounded w-1/2 mb-3" />
              <div className="h-10 bg-surface-800 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="card p-6">
          <div className="h-4 bg-surface-800 rounded w-1/4 mb-4" />
          <div className="h-32 bg-surface-800 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <svg className="w-16 h-16 text-surface-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-surface-400">{error}</p>
        <button onClick={fetchStreak} className="btn-secondary">Try Again</button>
      </div>
    );
  }

  if (!data) return null;

  const streakMessage = data.currentStreak === 0
    ? 'Record a video today to start your streak!'
    : data.currentStreak === 1
      ? 'Great start! Keep going tomorrow!'
      : data.currentStreak >= 7
        ? `Incredible! ${data.currentStreak} days straight!`
        : `${data.currentStreak} days strong! Keep it up!`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Motivational banner */}
      <div className="card p-6 sm:p-8 bg-gradient-to-br from-accent/10 via-surface-900/60 to-surface-900/60 border-accent/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold">{streakMessage}</p>
            <p className="text-sm text-surface-400 mt-1">
              Consistency is the key to growth
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6">
          <p className="text-sm font-medium text-surface-400 mb-1">Current Streak</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-accent tabular-nums">{data.currentStreak}</span>
            <span className="text-sm text-surface-500">day{data.currentStreak !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm font-medium text-surface-400 mb-1">Longest Streak</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums">{data.longestStreak}</span>
            <span className="text-sm text-surface-500">day{data.longestStreak !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm font-medium text-surface-400 mb-1">Total Days</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums">{data.totalRecordings}</span>
            <span className="text-sm text-surface-500">recording day{data.totalRecordings !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Activity calendar */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Last 90 Days</h3>
        <ActivityCalendar data={data.calendarData} />
      </div>

      {/* Recent activity */}
      {data.recordingDates.length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-4">Recent Activity</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.recordingDates.slice(0, 30).map((date) => {
              const d = new Date(date + 'T00:00:00');
              const isToday = date === new Date().toISOString().split('T')[0];
              return (
                <div
                  key={date}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-accent animate-pulse-slow' : 'bg-success'}`} />
                  <span className="text-sm text-surface-300">
                    {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {isToday && (
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
