"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck2, Clock3, PlaneTakeoff, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { useClockSession } from "@/components/time-tracking/clock-session";
import { formatDuration } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";

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
  vacation,
}: {
  closedSecondsToday: number;
  closedSecondsWeek: number;
  closedSecondsMonth: number;
  vacation: { remaining: number; used: number; allowance: number };
}) {
  const clock = useClockSession();
  const { t } = useLocale();
  const openClockIn = clock.session.status === "OFFLINE" ? null : clock.session.clockInTime;
  const openBreakStartedAt = clock.session.breakSince;
  const completedBreakSecondsOnOpen = clock.session.completedBreakSecondsOnOpen;
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hold = useRef({ lastLive: 0, carry: 0, wasOpen: false, seenClosedToday: closedSecondsToday });

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

  if (openClockIn) {
    hold.current.lastLive = liveOpen;
    hold.current.wasOpen = true;
  } else if (hold.current.wasOpen) {
    hold.current.carry += hold.current.lastLive;
    hold.current.lastLive = 0;
    hold.current.wasOpen = false;
  }

  const closedDelta = closedSecondsToday - hold.current.seenClosedToday;
  hold.current.seenClosedToday = closedSecondsToday;
  if (!openClockIn && closedDelta > 0) hold.current.carry = 0;

  const shown = liveOpen + hold.current.carry;

  // Same open session is part of today, this week, and this month.
  const todaySeconds = closedSecondsToday + shown;
  const weekSeconds = closedSecondsWeek + shown;
  const monthSeconds = closedSecondsMonth + shown;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label={t("kpi.today")} value={formatDuration(todaySeconds)} icon={Clock3} accent="primary" />
      <KpiCard label={t("kpi.week")} value={formatDuration(weekSeconds)} icon={TrendingUp} accent="success" />
      <KpiCard label={t("kpi.month")} value={formatDuration(monthSeconds)} icon={CalendarCheck2} accent="primary" />
      <KpiCard
        label={t("kpi.vacation")}
        value={`${vacation.remaining}d`}
        sublabel={t("kpi.vacationUsed", { used: vacation.used, allowance: vacation.allowance })}
        icon={PlaneTakeoff}
        accent="warning"
      />
    </div>
  );
}
