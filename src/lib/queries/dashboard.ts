import { LeaveType, LeaveStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ClockStatus } from "@/types/clock";
import { sumBreakSeconds, sumWorkedSeconds } from "@/lib/worked-time";
import { expectedWorkSeconds, owedSecondsOnDay, toDaysOff, type DayOff } from "@/lib/expected-hours";
import { dateKey, outOfOfficeContext, topUpSeconds } from "@/lib/out-of-office";
import { startOfDay, endOfDay, startOfWeek, startOfMonth, secondsBetween } from "@/lib/utils";
import { intlLocale, type Locale } from "@/lib/i18n/messages";
import type { WorkedChartPoint } from "@/lib/chart-range";

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
  const closedBreakSecondsToday = sumBreakSeconds(
    closed.filter((entry) => entry.clockIn >= todayStart),
    now,
  );

  const office = await outOfOfficeContext(employeeId, monthStart, todayEnd);
  const todayKey = dateKey(todayStart);
  let todayCredit = 0;
  let weekCredit = 0;
  let monthCredit = 0;
  const cursor = startOfDay(monthStart);
  while (cursor <= todayStart) {
    const key = dateKey(cursor);
    const isToday = key === todayKey;
    if (office.days.has(key) && !(isToday && openClockIn)) {
      const clocked = sumWorkedSeconds(entries, { from: startOfDay(cursor), to: endOfDay(cursor) }, now);
      const extra = topUpSeconds(clocked, office.dailySeconds, true);
      monthCredit += extra;
      if (cursor >= weekStart) weekCredit += extra;
      if (isToday) todayCredit += extra;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    closedSecondsToday: closedSecondsToday + todayCredit,
    closedBreakSecondsToday,
    closedSecondsWeek: closedSecondsWeek + weekCredit,
    closedSecondsMonth: closedSecondsMonth + monthCredit,
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

export async function getWorkedChart(
  employeeId: string,
  from: Date,
  to: Date,
  locale: Locale = "en",
): Promise<WorkedChartPoint[]> {
  const now = new Date();
  const today = startOfDay(now);
  const first = startOfDay(from);
  const last = startOfDay(to);
  const days: Date[] = [];
  for (const cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }
  if (days.length === 0) days.push(today);

  const [entries, office] = await Promise.all([
    prisma.clockEntry.findMany({
      where: { employeeId, clockIn: { gte: first, lte: endOfDay(last) } },
      include: { breaks: true },
    }),
    outOfOfficeContext(employeeId, first, last),
  ]);
  const openToday = entries.some((entry) => !entry.clockOut);

  const tag = intlLocale(locale);
  const longRange = days.length > 7;
  return days.map((day) => {
    let seconds = sumWorkedSeconds(entries, { from: day, to: endOfDay(day) }, now);
    const isToday = dateKey(day) === dateKey(today);
    if (office.days.has(dateKey(day)) && day <= today && !(isToday && openToday)) {
      seconds += topUpSeconds(seconds, office.dailySeconds, true);
    }
    const label = day.toLocaleDateString(tag, longRange ? { day: "2-digit", month: "2-digit" } : { weekday: "short" });
    return { day: label, seconds, hours: +(seconds / 3600).toFixed(2), future: day > today };
  });
}

export async function getWeeklyChartData(employeeId: string) {
  const today = startOfDay(new Date());
  const from = new Date(today);
  from.setDate(from.getDate() - 6);
  return getWorkedChart(employeeId, from, today, "en");
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

const FULL_DAY_OFF: LeaveType[] = [LeaveType.VACATION, LeaveType.SICK, LeaveType.PERSONAL];

/** Hours owed today, this week, and this month. Approved leave and paid holidays reduce them. */
export async function getExpectedWorkTargets(employeeId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const monthStart = startOfMonth(now);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const spanStart = weekStart < monthStart ? weekStart : monthStart;
  const spanEnd = weekEnd > monthEnd ? weekEnd : monthEnd;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { weeklyHours: true },
  });
  const dailySeconds = ((employee?.weeklyHours ?? 40) / 5) * 3600;

  const [leaves, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        type: { in: [...FULL_DAY_OFF, LeaveType.HALF_DAY] },
        startDate: { lte: endOfDay(spanEnd) },
        endDate: { gte: spanStart },
      },
      select: { type: true, dayPart: true, startDate: true, endDate: true },
    }),
    prisma.holiday.findMany({
      where: { isPaid: true, date: { lte: endOfDay(spanEnd) } },
      select: { date: true, endDate: true },
    }),
  ]);

  const daysOff: DayOff[] = [
    ...leaves.map((leave) => ({
      start: leave.startDate,
      end: leave.endDate,
      fraction: leave.type === LeaveType.HALF_DAY || leave.dayPart !== "FULL" ? 0.5 : 1,
    })),
    ...holidays
      .filter((holiday) => (holiday.endDate ?? holiday.date) >= spanStart)
      .map((holiday) => ({
        start: holiday.date,
        end: holiday.endDate ?? holiday.date,
        fraction: 1,
      })),
  ];

  return {
    today: expectedWorkSeconds(today, today, dailySeconds, daysOff),
    week: expectedWorkSeconds(weekStart, weekEnd, dailySeconds, daysOff),
    month: expectedWorkSeconds(monthStart, monthEnd, dailySeconds, daysOff),
  };
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

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const ids = employees.map((emp) => emp.id);
  const [dayEntries, leaves, holidays] = ids.length
    ? await Promise.all([
        prisma.clockEntry.findMany({
          where: {
            employeeId: { in: ids },
            clockIn: { lte: now },
            OR: [{ clockOut: null }, { clockOut: { gte: todayStart } }],
          },
          include: { breaks: true },
        }),
        prisma.leaveRequest.findMany({
          where: {
            employeeId: { in: ids },
            status: LeaveStatus.APPROVED,
            type: { in: [...FULL_DAY_OFF, LeaveType.HALF_DAY] },
            startDate: { lte: todayEnd },
            endDate: { gte: todayStart },
          },
          select: { employeeId: true, type: true, dayPart: true, startDate: true, endDate: true },
        }),
        prisma.holiday.findMany({
          where: { isPaid: true, date: { lte: todayEnd } },
          select: { date: true, endDate: true },
        }),
      ])
    : [[], [], []];

  return employees.map((emp) => {
    const openEntry = emp.clockEntries[0];
    let status: ClockStatus = "OFFLINE";
    if (openEntry) {
      const onBreak = openEntry.breaks.some((b) => !b.endedAt);
      status = onBreak ? "ON_BREAK" : "WORKING";
    }
    const mine = dayEntries.filter((entry) => entry.employeeId === emp.id);
    const worked = sumWorkedSeconds(mine, { from: todayStart, to: todayEnd }, now);
    const owed = owedSecondsOnDay(
      emp.weeklyHours,
      now,
      toDaysOff(
        leaves.filter((leave) => leave.employeeId === emp.id),
        holidays,
        todayStart,
      ),
    );
    return {
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      position: emp.position,
      department: emp.department?.name ?? "—",
      avatarUrl: emp.avatarUrl,
      status,
      overtime: worked - owed > 60 * 60,
    };
  });
}

export async function getUpcomingLeave(opts: {
  employeeId?: string;
  teamWide?: boolean;
  managerId?: string;
}) {
  let where: Record<string, unknown>;

  const upcoming = {
    status: {
      in: opts.teamWide
        ? [LeaveStatus.APPROVED]
        : [LeaveStatus.APPROVED, LeaveStatus.PENDING, LeaveStatus.REJECTED],
    },
    endDate: { gte: startOfDay(new Date()) },
  };

  if (opts.teamWide) {
    where = upcoming;
  } else if (opts.managerId) {
    const team = await prisma.employee.findMany({
      where: { managerId: opts.managerId },
      select: { id: true },
    });
    const ids = [opts.managerId, ...team.map((e) => e.id)];
    where = { employeeId: { in: ids }, ...upcoming };
  } else {
    where = { employeeId: opts.employeeId, ...upcoming };
  }

  return prisma.leaveRequest.findMany({
    where,
    include: { employee: true },
    orderBy: { startDate: "asc" },
    take: 12,
  });
}
