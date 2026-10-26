import { calendarDate } from "@/lib/utils";

export type DayPartValue = "FULL" | "MORNING" | "AFTERNOON";

export function isHalfDay(type: string, dayPart: DayPartValue): boolean {
  return dayPart === "MORNING" || dayPart === "AFTERNOON" || type === "HALF_DAY";
}

function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Half vacation is one weekday and counts as 0.5. The end date is the same day. */
export function resolveLeaveLength(
  type: string,
  dayPart: DayPartValue,
  startDate: Date,
  endDate: Date,
): { totalDays: number; endDate: Date; error?: string } {
  const part: DayPartValue = type === "VACATION" || type === "HALF_DAY" ? dayPart : "FULL";
  if (isHalfDay(type, part)) {
    const day = calendarDate(startDate).getDay();
    if (day === 0 || day === 6) {
      return { totalDays: 0, endDate: startDate, error: "A half day has to be a weekday." };
    }
    return { totalDays: 0.5, endDate: startDate };
  }
  return { totalDays: businessDaysBetween(startDate, endDate), endDate };
}
