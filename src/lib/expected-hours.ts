import { calendarDate, startOfDay } from "@/lib/utils";

export type DayOff = {
  start: Date;
  end: Date;
  /** 1 means the day is not owed. 0.5 is a half day. */
  fraction: number;
};

function dayKey(date: Date): string {
  const d = calendarDate(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Weekday hours still owed in the range. Vacation, leave, and holidays reduce the total. */
export function expectedWorkSeconds(from: Date, to: Date, dailySeconds: number, daysOff: DayOff[]): number {
  const off = new Map<string, number>();
  for (const absence of daysOff) {
    const cursor = startOfDay(calendarDate(absence.start));
    const end = startOfDay(calendarDate(absence.end));
    while (cursor <= end) {
      const key = dayKey(cursor);
      off.set(key, Math.min(1, (off.get(key) ?? 0) + absence.fraction));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  let total = 0;
  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      const fraction = Math.min(1, off.get(dayKey(cursor)) ?? 0);
      total += dailySeconds * (1 - fraction);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.round(total);
}

/** "8h" or "7h 30m". Zero is "0h". */
export function formatWorkTarget(seconds: number): string {
  if (seconds <= 0) return "0h";
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
