import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClockStatus, getExpectedWorkTargets, getTodayWorkedBreakdown, getVacationBalance } from "@/lib/queries/dashboard";
import { resolveShiftRange } from "@/lib/shift-period";
import { resolveTeamView } from "@/lib/team-view";
import { ClockWidget } from "@/components/time-tracking/clock-widget";
import { ClockSessionProvider } from "@/components/time-tracking/clock-session";
import { ShiftHistory } from "@/components/time-tracking/shift-history";
import { ShiftPeriodFilter } from "@/components/time-tracking/shift-period-filter";
import { TeamMemberSelect } from "@/components/layout/team-member-select";
import { WorkedHoursKpis } from "@/components/dashboard/worked-hours-kpis";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";
import { balanceSeconds, formatBalance } from "@/lib/day-balance";
import { dateKey, outOfOfficeContext } from "@/lib/out-of-office";
import { sumWorkedSeconds } from "@/lib/worked-time";

export default async function TimeTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; period?: string; week?: string; month?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const selfEmployeeId = session.user.employeeId;
  if (!selfEmployeeId) redirect("/dashboard");

  const { employeeId: requestedId, period, week, month, from, to } = await searchParams;
  const range = resolveShiftRange({ period, week, month, from, to });
  const locale = await getLocale();
  const view = await resolveTeamView({
    role: session.user.role,
    selfEmployeeId,
    requestedId,
  });

  const employeeId = view.viewedEmployeeId;

  const [clockStatus, attendances, worked, vacation, targets, office] = await Promise.all([
    getClockStatus(employeeId),
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: range.from, lte: range.to } },
      include: { clockEntries: { include: { breaks: true }, orderBy: { clockIn: "asc" } } },
      orderBy: { date: "desc" },
    }),
    getTodayWorkedBreakdown(employeeId),
    getVacationBalance(employeeId),
    getExpectedWorkTargets(employeeId),
    outOfOfficeContext(employeeId, range.from, range.to),
  ]);

  const todayKey = dateKey(new Date());
  const clockedInToday = clockStatus.status !== "OFFLINE";
  const historyDays = attendances.map((day) => {
    const key = dateKey(day.date);
    const credit = office.days.has(key) && !(key === todayKey && clockedInToday);
    return {
      id: day.id,
      date: day.date,
      clockEntries: day.clockEntries,
      creditedSeconds: credit ? office.dailySeconds : 0,
    };
  });
  for (const key of office.days) {
    if (key > todayKey || historyDays.some((day) => dateKey(day.date) === key)) continue;
    const [year, month, day] = key.split("-").map(Number);
    historyDays.push({
      id: `ooo-${key}`,
      date: new Date(year, month - 1, day),
      clockEntries: [],
      creditedSeconds: key === todayKey && clockedInToday ? 0 : office.dailySeconds,
    });
  }

  const dayWorked = (day: (typeof historyDays)[number]) => {
    const clocked = day.clockEntries.length > 0 ? sumWorkedSeconds(day.clockEntries) : 0;
    const open = day.clockEntries.some((entry) => !entry.clockOut);
    return open ? clocked : Math.max(clocked, day.creditedSeconds);
  };
  const rangeBalance = historyDays.reduce((sum, day) => {
    const seconds = dayWorked(day);
    if (seconds <= 0) return sum;
    return sum + balanceSeconds(seconds);
  }, 0);
  const workedDays = historyDays.filter((day) => dayWorked(day) > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "time.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {view.isSelf
              ? translate(locale, "time.subtitle")
              : translate(locale, "time.reviewing", { name: view.viewedName })}
          </p>
        </div>
        {view.canViewTeam && <TeamMemberSelect members={view.members} value={employeeId} />}
      </div>

      <ClockSessionProvider
        key={employeeId}
        initial={{
          status: clockStatus.status,
          clockInTime: clockStatus.openEntry?.clockIn.toISOString() ?? null,
          breakSince: clockStatus.onBreakSince?.toISOString() ?? null,
          completedBreakSecondsOnOpen: worked.completedBreakSecondsOnOpen,
        }}
      >
        <ClockWidget
          readOnly={!view.isSelf}
          personLabel={view.isSelf ? undefined : view.viewedName}
          closedSecondsToday={worked.closedSecondsToday}
          closedBreakSecondsToday={worked.closedBreakSecondsToday}
          expectedSecondsToday={targets.today}
        />

        <WorkedHoursKpis
          closedSecondsToday={worked.closedSecondsToday}
          closedSecondsWeek={worked.closedSecondsWeek}
          closedSecondsMonth={worked.closedSecondsMonth}
          vacation={vacation}
          targetToday={targets.today}
          targetWeek={targets.week}
          targetMonth={targets.month}
        />
      </ClockSessionProvider>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base text-foreground">
            {view.isSelf ? translate(locale, "time.shifts") : translate(locale, "time.shiftsFor", { name: view.viewedName })}
          </CardTitle>
          <Suspense>
            <ShiftPeriodFilter
              period={range.period}
              week={range.week}
              month={range.month}
              from={range.fromInput}
              to={range.toInput}
            />
          </Suspense>
        </CardHeader>
        <CardContent className="space-y-4">
          <p
            className={`text-sm font-medium tabular-nums ${
              workedDays === 0
                ? "text-muted-foreground"
                : rangeBalance > 0
                  ? "text-success"
                  : rangeBalance < 0
                    ? "text-danger"
                    : "text-foreground"
            }`}
          >
            {workedDays === 0 ? "N/A" : formatBalance(rangeBalance)}
          </p>
          <ShiftHistory days={historyDays} isSelf={view.isSelf} period={range.period} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
