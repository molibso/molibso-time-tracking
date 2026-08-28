"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AttendanceDay {
  date: string; // ISO yyyy-mm-dd
  status: "PRESENT" | "ABSENT" | "VACATION" | "SICK" | "REMOTE" | "HOLIDAY" | "HALF_DAY";
}

const STATUS_STYLE: Record<AttendanceDay["status"], string> = {
  PRESENT: "bg-success/15 text-success border-success/30",
  ABSENT: "bg-danger/15 text-danger border-danger/30",
  VACATION: "bg-primary/15 text-primary border-primary/30",
  SICK: "bg-warning/15 text-warning border-warning/30",
  REMOTE: "bg-info/15 text-info border-info/30",
  HOLIDAY: "bg-muted text-muted-foreground border-border",
  HALF_DAY: "bg-primary/10 text-primary border-primary/20",
};

const LEGEND: { label: string; status: AttendanceDay["status"] }[] = [
  { label: "Present", status: "PRESENT" },
  { label: "Absent", status: "ABSENT" },
  { label: "Vacation", status: "VACATION" },
  { label: "Sick", status: "SICK" },
  { label: "Remote", status: "REMOTE" },
  { label: "Holiday", status: "HOLIDAY" },
];

export function AttendanceCalendar({ days }: { days: AttendanceDay[] }) {
  const [cursor, setCursor] = useState(new Date());
  const map = new Map(days.map((d) => [d.date, d.status]));

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
        <h3 className="font-medium">
          {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground mb-1.5">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const status = map.get(key(day));
          return (
            <div
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border text-sm font-medium",
                status ? STATUS_STYLE[status] : "border-border text-foreground/70"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {LEGEND.map((l) => (
          <div key={l.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 rounded-full border", STATUS_STYLE[l.status])} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
