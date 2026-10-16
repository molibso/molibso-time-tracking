"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDuration } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";
import { intlLocale, type MessageKey } from "@/lib/i18n/messages";

export interface AttendanceDay {
  date: string; // local yyyy-mm-dd
  status: "PRESENT" | "ABSENT" | "VACATION" | "SICK" | "REMOTE" | "HOLIDAY" | "HALF_DAY";
  workedSeconds: number;
}

/** A present day is green only after a full 8 hours. Shorter present days are reddish. */
const FULL_DAY_SECONDS = 8 * 60 * 60;

const FULL_DAY_STYLE = "bg-success/15 text-success border-success/30";
const SHORT_DAY_STYLE = "bg-danger/15 text-danger border-danger/30";

const STATUS_STYLE: Record<Exclude<AttendanceDay["status"], "PRESENT">, string> = {
  ABSENT: "bg-petrol/10 text-petrol border-petrol/25",
  VACATION: "bg-primary/15 text-primary border-primary/30",
  SICK: "bg-warning/15 text-warning border-warning/30",
  REMOTE: "bg-smart/15 text-smart border-smart/30",
  HOLIDAY: "bg-sani/15 text-sani border-sani/30",
  HALF_DAY: "bg-info/15 text-info border-info/30",
};

const LEGEND: { labelKey: MessageKey; className: string }[] = [
  { labelKey: "attendance.fullDay", className: FULL_DAY_STYLE },
  { labelKey: "attendance.shortDay", className: SHORT_DAY_STYLE },
  { labelKey: "attendance.absent", className: STATUS_STYLE.ABSENT },
  { labelKey: "attendance.vacation", className: STATUS_STYLE.VACATION },
  { labelKey: "attendance.sick", className: STATUS_STYLE.SICK },
  { labelKey: "attendance.remote", className: STATUS_STYLE.REMOTE },
  { labelKey: "attendance.holiday", className: STATUS_STYLE.HOLIDAY },
  { labelKey: "attendance.halfDay", className: STATUS_STYLE.HALF_DAY },
];

function cellStyle(day: AttendanceDay): string {
  if (day.status === "PRESENT") return day.workedSeconds > FULL_DAY_SECONDS ? FULL_DAY_STYLE : SHORT_DAY_STYLE;
  return STATUS_STYLE[day.status];
}

function compactDuration(totalSeconds: number): string {
  const abs = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return seconds > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${minutes}m`;
  return `${seconds}s`;
}

export function AttendanceCalendar({ days }: { days: AttendanceDay[] }) {
  const [cursor, setCursor] = useState(new Date());
  const { t, locale } = useLocale();
  const map = new Map(days.map((d) => [d.date, d]));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function key(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-medium">
          {cursor.toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric" })}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-3 text-center text-sm font-medium text-muted-foreground">
        {Array.from({ length: 7 }, (_, index) => {
          const date = new Date(2026, 0, 5 + index);
          const label = date.toLocaleDateString(intlLocale(locale), { weekday: "short" });
          return <div key={index}>{label}</div>;
        })}
      </div>

      <div className="grid grid-cols-7 gap-3">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const entry = map.get(key(day));
          const showTime = entry != null && (entry.workedSeconds > 0 || entry.status === "PRESENT");
          return (
            <div
              key={i}
              title={entry && showTime ? formatDuration(entry.workedSeconds) : undefined}
              className={cn(
                "flex min-h-[8.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-3",
                entry ? cellStyle(entry) : "border-border text-foreground/70",
              )}
            >
              <span className="text-lg font-medium leading-none">{day}</span>
              {showTime && entry && (
                <span className="text-sm font-medium leading-tight tabular-nums">{compactDuration(entry.workedSeconds)}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {LEGEND.map((item) => (
          <div key={item.labelKey} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-full border", item.className)} />
            {t(item.labelKey)}
          </div>
        ))}
      </div>
    </div>
  );
}
