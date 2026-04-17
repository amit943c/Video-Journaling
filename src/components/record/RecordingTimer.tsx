'use client';

import { useEffect, useState } from 'react';

interface RecordingTimerProps {
  isRecording: boolean;
  isPaused: boolean;
}

export default function RecordingTimer({ isRecording, isPaused }: RecordingTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      return;
    }

    if (isPaused) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-3">
      {isRecording && (
        <span className="relative flex h-3 w-3">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-warning' : 'bg-danger animate-ping'}`} />
          <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-warning' : 'bg-danger'}`} />
        </span>
      )}
      <span className="font-mono text-2xl font-semibold tracking-wider tabular-nums">
        {hours > 0 && `${pad(hours)}:`}
        {pad(minutes)}:{pad(seconds)}
      </span>
      {isPaused && (
        <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
          PAUSED
        </span>
      )}
    </div>
  );
}
