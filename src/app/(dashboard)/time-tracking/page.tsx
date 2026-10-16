import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClockStatus, getTodayWorkedBreakdown, getVacationBalance } from "@/lib/queries/dashboard";
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

  const [clockStatus, attendances, worked, vacation] = await Promise.all([
    getClockStatus(employeeId),
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: range.from, lte: range.to } },
      include: { clockEntries: { include: { breaks: true }, orderBy: { clockIn: "asc" } } },
      orderBy: { date: "desc" },
    }),
    getTodayWorkedBreakdown(employeeId),
    getVacationBalance(employeeId),
  ]);

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
        <ClockWidget readOnly={!view.isSelf} personLabel={view.isSelf ? undefined : view.viewedName} />

        <WorkedHoursKpis
          closedSecondsToday={worked.closedSecondsToday}
          closedSecondsWeek={worked.closedSecondsWeek}
          closedSecondsMonth={worked.closedSecondsMonth}
          vacation={vacation}
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
        <CardContent>
          <ShiftHistory days={attendances} isSelf={view.isSelf} period={range.period} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
