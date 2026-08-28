"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, Clock3, PlaneTakeoff, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatDuration } from "@/lib/utils";

/** Open-session worked seconds (breaks excluded), computed live. */
function openSessionSeconds(opts: {
  openClockIn: string | null;
  openBreakStartedAt: string | null;
  completedBreakSecondsOnOpen: number;
  nowMs: number;
}): number {
  if (!opts.openClockIn) return 0;

  const clockInMs = new Date(opts.openClockIn).getTime();
  let openSeconds = Math.max(0, Math.floor((opts.nowMs - clockInMs) / 1000));
  openSeconds -= opts.completedBreakSecondsOnOpen;

  if (opts.openBreakStartedAt) {
    const breakMs = new Date(opts.openBreakStartedAt).getTime();
    openSeconds -= Math.max(0, Math.floor((opts.nowMs - breakMs) / 1000));
  }

  return Math.max(0, openSeconds);
}

export function WorkedHoursKpis({
  closedSecondsToday,
  closedSecondsWeek,
  closedSecondsMonth,
  openClockIn,
  openBreakStartedAt,
  completedBreakSecondsOnOpen,
  vacation,
}: {
  closedSecondsToday: number;
  closedSecondsWeek: number;
  closedSecondsMonth: number;
  openClockIn: string | null;
  openBreakStartedAt: string | null;
  completedBreakSecondsOnOpen: number;
  vacation: { remaining: number; used: number; allowance: number };
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!openClockIn) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [openClockIn]);

  const liveOpen = openSessionSeconds({
    openClockIn,
    openBreakStartedAt,
    completedBreakSecondsOnOpen,
    nowMs,
  });

  // Same live open session added to all three — today ≤ week ≤ month stays consistent.
  const todaySeconds = closedSecondsToday + liveOpen;
  const weekSeconds = closedSecondsWeek + liveOpen;
  const monthSeconds = closedSecondsMonth + liveOpen;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Worked Today" value={formatDuration(todaySeconds)} icon={Clock3} accent="primary" />
      <KpiCard label="This Week" value={formatDuration(weekSeconds)} icon={TrendingUp} accent="success" />
      <KpiCard label="This Month" value={formatDuration(monthSeconds)} icon={CalendarCheck2} accent="primary" />
      <KpiCard
        label="Vacation Left"
        value={`${vacation.remaining}d`}
        sublabel={`${vacation.used} used of ${vacation.allowance}`}
        icon={PlaneTakeoff}
        accent="warning"
      />
    </div>
  );
}
