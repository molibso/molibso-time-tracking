import { prisma } from "@/lib/prisma";
import type { ClockStatus } from "@/types/clock";
import { sumWorkedSeconds } from "@/lib/worked-time";
import { startOfDay, endOfDay, startOfWeek, startOfMonth, secondsBetween } from "@/lib/utils";

export async function getClockStatus(employeeId: string): Promise<{
  status: ClockStatus;
  openEntry: { id: string; clockIn: Date } | null;
  onBreakSince: Date | null;
}> {
  const openEntry = await prisma.clockEntry.findFirst({
    where: { employeeId, clockOut: null },
    include: { breaks: true },
    orderBy: { clockIn: "desc" },
  });

  if (!openEntry) return { status: "OFFLINE", openEntry: null, onBreakSince: null };

  const openBreak = openEntry.breaks.find((b) => !b.endedAt);
  if (openBreak) {
    return { status: "ON_BREAK", openEntry: { id: openEntry.id, clockIn: openEntry.clockIn }, onBreakSince: openBreak.startedAt };
  }

  return { status: "WORKING", openEntry: { id: openEntry.id, clockIn: openEntry.clockIn }, onBreakSince: null };
}

/** Sums worked seconds (including the still-open entry) for a date range. Breaks are excluded. */
export async function getWorkedSeconds(employeeId: string, from: Date, to: Date): Promise<number> {
  const entries = await prisma.clockEntry.findMany({
    where: { employeeId, clockIn: { gte: from, lte: to } },
    include: { breaks: true },
  });

  return sumWorkedSeconds(entries, { from, to });
}

export async function getWorkedMinutes(employeeId: string, from: Date, to: Date): Promise<number> {
  return Math.floor((await getWorkedSeconds(employeeId, from, to)) / 60);
}

/**
 * Closed (completed) worked seconds for today/week/month + open session metadata for live ticking.
 * Open session time is NOT included in closed* — the client adds it live so all KPIs stay in sync.
 */
export async function getTodayWorkedBreakdown(employeeId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const entries = await prisma.clockEntry.findMany({
    where: { employeeId, clockIn: { gte: monthStart, lte: todayEnd } },
    include: { breaks: true },
    orderBy: { clockIn: "asc" },
  });

  let openClockIn: Date | null = null;
  let openBreakStartedAt: Date | null = null;
  let completedBreakSecondsOnOpen = 0;

  for (const entry of entries) {
    if (entry.clockOut) continue;
    openClockIn = entry.clockIn;
    for (const b of entry.breaks) {
      if (b.endedAt) {
        completedBreakSecondsOnOpen += secondsBetween(b.startedAt, b.endedAt);
      } else {
        openBreakStartedAt = b.startedAt;
      }
    }
  }

  const closed = entries.filter((entry) => entry.clockOut);
  const closedSecondsMonth = sumWorkedSeconds(closed, { from: monthStart, to: todayEnd }, now);
  const closedSecondsWeek = sumWorkedSeconds(closed, { from: weekStart, to: todayEnd }, now);
  const closedSecondsToday = sumWorkedSeconds(closed, { from: todayStart, to: todayEnd }, now);

  return {
    closedSecondsToday,
    closedSecondsWeek,
    closedSecondsMonth,
    openClockIn: openClockIn?.toISOString() ?? null,
    openBreakStartedAt: openBreakStartedAt?.toISOString() ?? null,
    completedBreakSecondsOnOpen,
  };
}

export async function getDashboardHours(employeeId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const rangeStart = weekStart < monthStart ? weekStart : monthStart;

  const entries = await prisma.clockEntry.findMany({
    where: { employeeId, clockIn: { gte: rangeStart, lte: todayEnd } },
    include: { breaks: true },
  });

  return {
    today: sumWorkedSeconds(entries, { from: todayStart, to: todayEnd }, now),
    week: sumWorkedSeconds(entries, { from: weekStart, to: todayEnd }, now),
    month: sumWorkedSeconds(entries, { from: monthStart, to: todayEnd }, now),
  };
}

export async function getWeeklyChartData(employeeId: string) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - index));
    return { start: startOfDay(d), label: d.toLocaleDateString("en-US", { weekday: "short" }) };
  });

  const entries = await prisma.clockEntry.findMany({
    where: { employeeId, clockIn: { gte: days[0].start, lte: endOfDay(now) } },
    include: { breaks: true },
  });

  return days.map((day) => {
    const seconds = sumWorkedSeconds(entries, { from: day.start, to: endOfDay(day.start) }, now);
    return { day: day.label, seconds, hours: +(seconds / 3600).toFixed(2) };
  });
}

export async function getVacationBalance(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { allowance: 0, used: 0, remaining: 0 };

  const used = await prisma.leaveRequest.aggregate({
    where: { employeeId, type: "VACATION", status: "APPROVED" },
    _sum: { totalDays: true },
  });

  const usedDays = used._sum.totalDays ?? 0;
  return { allowance: employee.vacationAllowance, used: usedDays, remaining: employee.vacationAllowance - usedDays };
}

export async function getTeamAvailability(opts?: { managerId?: string; all?: boolean }) {
  const where =
    opts?.all === true
      ? { status: "ACTIVE" as const }
      : opts?.managerId
        ? { status: "ACTIVE" as const, managerId: opts.managerId }
        : { status: "ACTIVE" as const };

  const employees = await prisma.employee.findMany({
    where,
    include: {
      clockEntries: {
        where: { clockOut: null },
        include: { breaks: true },
        take: 1,
      },
      department: true,
    },
    orderBy: { firstName: "asc" },
    take: 30,
  });

  return employees.map((emp) => {
    const openEntry = emp.clockEntries[0];
    let status: ClockStatus = "OFFLINE";
    if (openEntry) {
      const onBreak = openEntry.breaks.some((b) => !b.endedAt);
      status = onBreak ? "ON_BREAK" : "WORKING";
    }
    return {
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      position: emp.position,
      department: emp.department?.name ?? "—",
      avatarUrl: emp.avatarUrl,
      status,
    };
  });
}

export async function getUpcomingLeave(opts: {
  employeeId?: string;
  teamWide?: boolean;
  managerId?: string;
}) {
  let where: Record<string, unknown>;

  if (opts.teamWide) {
    where = { status: "APPROVED", startDate: { gte: startOfDay(new Date()) } };
  } else if (opts.managerId) {
    const team = await prisma.employee.findMany({
      where: { managerId: opts.managerId },
      select: { id: true },
    });
    const ids = [opts.managerId, ...team.map((e) => e.id)];
    where = { employeeId: { in: ids }, status: "APPROVED", startDate: { gte: startOfDay(new Date()) } };
  } else {
    where = { employeeId: opts.employeeId, status: "APPROVED", startDate: { gte: startOfDay(new Date()) } };
  }

  return prisma.leaveRequest.findMany({
    where,
    include: { employee: true },
    orderBy: { startDate: "asc" },
    take: 8,
  });
}
