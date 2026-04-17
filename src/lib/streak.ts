import { StreakData, CalendarDay } from './types';

export function computeStreakData(uploadDates: string[]): StreakData {
  if (uploadDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalRecordings: 0,
      recordingDates: [],
      calendarData: buildCalendarData([]),
    };
  }

  const uniqueSorted = [...new Set(uploadDates)].sort().reverse();
  const datesAsc = [...uniqueSorted].reverse();

  const currentStreak = computeCurrentStreak(uniqueSorted);
  const longestStreak = computeLongestStreak(datesAsc);

  return {
    currentStreak,
    longestStreak,
    totalRecordings: uniqueSorted.length,
    recordingDates: uniqueSorted,
    calendarData: buildCalendarData(uniqueSorted),
  };
}

function computeCurrentStreak(datesSortedDesc: string[]): number {
  if (datesSortedDesc.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateKey(yesterday);

  const mostRecent = datesSortedDesc[0];
  if (mostRecent !== todayStr && mostRecent !== yesterdayStr) return 0;

  let streak = 1;
  let currentDate = parseDate(mostRecent);

  for (let i = 1; i < datesSortedDesc.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);

    if (datesSortedDesc[i] === formatDateKey(prevDate)) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

function computeLongestStreak(datesSortedAsc: string[]): number {
  if (datesSortedAsc.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < datesSortedAsc.length; i++) {
    const prev = parseDate(datesSortedAsc[i - 1]);
    const curr = parseDate(datesSortedAsc[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  return longest;
}

function buildCalendarData(datesSortedDesc: string[]): CalendarDay[] {
  const dateCountMap = new Map<string, number>();
  for (const d of datesSortedDesc) {
    dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
  }

  // Build last 90 days
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = formatDateKey(d);
    const count = dateCountMap.get(key) || 0;
    days.push({ date: key, count, hasRecording: count > 0 });
  }

  return days;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
