type TimedShift = {
  clockIn: Date;
  clockOut: Date | null;
  breaks: { startedAt: Date; endedAt: Date | null }[];
};

type Interval = { start: number; end: number };

function subtractInterval(segment: Interval, cutStart: number, cutEnd: number): Interval[] {
  if (cutEnd <= cutStart || cutEnd <= segment.start || cutStart >= segment.end) return [segment];
  const parts: Interval[] = [];
  if (cutStart > segment.start) parts.push({ start: segment.start, end: cutStart });
  if (cutEnd < segment.end) parts.push({ start: cutEnd, end: segment.end });
  return parts;
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last || interval.start > last.end) merged.push({ start: interval.start, end: interval.end });
    else last.end = Math.max(last.end, interval.end);
  }
  return merged;
}

function secondsIn(intervals: Interval[]): number {
  return mergeIntervals(intervals).reduce((sum, interval) => sum + Math.floor((interval.end - interval.start) / 1000), 0);
}

/** Worked stretches for one shift, with breaks removed. An open shift runs until `now`. */
export function workedSegments(entry: TimedShift, now = new Date()): Interval[] {
  const shiftEnd = entry.clockOut ?? now;
  const start = entry.clockIn.getTime();
  const end = shiftEnd.getTime();
  if (end <= start) return [];

  let segments: Interval[] = [{ start, end }];
  for (const breakEntry of entry.breaks) {
    const breakStart = breakEntry.startedAt.getTime();
    const breakEnd = (breakEntry.endedAt ?? shiftEnd).getTime();
    segments = segments.flatMap((segment) => subtractInterval(segment, breakStart, breakEnd));
  }
  return segments;
}

/**
 * Worked seconds across shifts. Overlapping shifts count once.
 * When `range` is set, only the portion inside that window is counted.
 */
export function sumWorkedSeconds(
  entries: TimedShift[],
  range?: { from: Date; to: Date },
  now = new Date(),
): number {
  const from = range?.from.getTime() ?? Number.NEGATIVE_INFINITY;
  const to = range?.to.getTime() ?? Number.POSITIVE_INFINITY;
  const intervals: Interval[] = [];

  for (const entry of entries) {
    for (const segment of workedSegments(entry, now)) {
      const start = Math.max(segment.start, from);
      const end = Math.min(segment.end, to);
      if (end > start) intervals.push({ start, end });
    }
  }

  return secondsIn(intervals);
}

/** Break seconds across shifts. Overlapping breaks count once, and only inside the shift. */
export function sumBreakSeconds(entries: TimedShift[], now = new Date()): number {
  const intervals: Interval[] = [];

  for (const entry of entries) {
    const shiftEndAt = entry.clockOut ?? now;
    const shiftStart = entry.clockIn.getTime();
    const shiftEnd = shiftEndAt.getTime();
    for (const breakEntry of entry.breaks) {
      const start = Math.max(breakEntry.startedAt.getTime(), shiftStart);
      const end = Math.min((breakEntry.endedAt ?? shiftEndAt).getTime(), shiftEnd);
      if (end > start) intervals.push({ start, end });
    }
  }

  return secondsIn(intervals);
}
