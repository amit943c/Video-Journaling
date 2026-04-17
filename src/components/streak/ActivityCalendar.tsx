'use client';

import { CalendarDay } from '@/lib/types';

interface ActivityCalendarProps {
  data: CalendarDay[];
}

export default function ActivityCalendar({ data }: ActivityCalendarProps) {
  const weeks: CalendarDay[][] = [];
  let currentWeek: CalendarDay[] = [];

  if (data.length > 0) {
    const firstDayOfWeek = new Date(data[0].date).getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, hasRecording: false });
    }
  }

  for (const day of data) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-1 min-w-fit">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-[14px] flex items-center">
              <span className="text-[10px] text-surface-600 w-6 text-right">{label}</span>
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={`${wi}-${di}`}
                className={`w-[14px] h-[14px] rounded-sm transition-colors ${
                  !day.date
                    ? 'bg-transparent'
                    : day.hasRecording
                      ? day.count >= 3
                        ? 'bg-accent'
                        : day.count >= 2
                          ? 'bg-accent/70'
                          : 'bg-accent/40'
                      : 'bg-surface-800 hover:bg-surface-700'
                }`}
                title={day.date ? `${day.date}: ${day.count} recording${day.count !== 1 ? 's' : ''}` : ''}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-xs text-surface-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-[14px] h-[14px] rounded-sm bg-surface-800" />
          <div className="w-[14px] h-[14px] rounded-sm bg-accent/40" />
          <div className="w-[14px] h-[14px] rounded-sm bg-accent/70" />
          <div className="w-[14px] h-[14px] rounded-sm bg-accent" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
