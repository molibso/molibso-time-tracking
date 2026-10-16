import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, isBoss } from "@/lib/rbac";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";
import { getRoleView } from "@/lib/role-views";
import { getVisibleEmployeeIds, leaveEmployeeIdsWhere } from "@/lib/role-scope";
import {
  getClockStatus,
  getTodayWorkedBreakdown,
  getWeeklyChartData,
  getVacationBalance,
  getTeamAvailability,
  getUpcomingLeave,
} from "@/lib/queries/dashboard";
import { ClockWidget } from "@/components/time-tracking/clock-widget";
import { ClockSessionProvider } from "@/components/time-tracking/clock-session";
import { WorkedHoursKpis } from "@/components/dashboard/worked-hours-kpis";
import { WeeklyHoursChart } from "@/components/charts/weekly-hours-chart";
import { TeamAvailability } from "@/components/dashboard/team-availability";
import { UpcomingLeave } from "@/components/dashboard/upcoming-leave";
import { ForbiddenBanner } from "@/components/dashboard/forbidden-banner";
import {
  AdminQuickLinks,
  PendingActionsCard,
  RoleCapabilitiesCard,
} from "@/components/dashboard/role-panels";
import { RoleBadge } from "@/components/layout/role-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { error } = await searchParams;
  const role = session.user.role ?? Role.EMPLOYEE;
  const roleView = getRoleView(role);
  const locale = await getLocale();
  const boss = isBoss(role);
  const canViewTeam = hasPermission(role, "EMPLOYEE_VIEW_ALL");
  const canApprove = hasPermission(role, "LEAVE_APPROVE");
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-muted-foreground">
          {translate(locale, "dashboard.unlinked")}
        </p>
      </div>
    );
  }

  const visibleIds = await getVisibleEmployeeIds(prisma, role, employeeId);

  const [
    clockStatus,
    worked,
    chartData,
    vacation,
    teamAvailability,
    upcomingLeaveRaw,
    employee,
    pendingLeave,
    pendingCorrections,
    employeeCount,
  ] = await Promise.all([
    getClockStatus(employeeId),
    getTodayWorkedBreakdown(employeeId),
    getWeeklyChartData(employeeId),
    getVacationBalance(employeeId),
    canViewTeam ? getTeamAvailability({ all: true }) : Promise.resolve([]),
    getUpcomingLeave(canViewTeam ? { teamWide: true } : { employeeId }),
    prisma.employee.findUnique({ where: { id: employeeId } }),
    canApprove
      ? prisma.leaveRequest.count({
          where: { status: "PENDING", ...leaveEmployeeIdsWhere(visibleIds) },
        })
      : Promise.resolve(0),
    canApprove
      ? prisma.correctionRequest.count({
          where: { status: "PENDING", ...leaveEmployeeIdsWhere(visibleIds) },
        })
      : Promise.resolve(0),
    boss ? prisma.employee.count({ where: { status: "ACTIVE" } }) : Promise.resolve(0),
  ]);

  const upcomingLeave = upcomingLeaveRaw.map((l) => ({
    id: l.id,
    employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
    type: l.type,
    startDate: l.startDate,
    endDate: l.endDate,
    totalDays: l.totalDays,
  }));

  return (
    <div className="space-y-6">
      <ForbiddenBanner show={error === "forbidden"} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {translate(locale, "dashboard.welcome", {
                name: employee?.firstName ?? translate(locale, "dashboard.there"),
              })}
            </h1>
            <RoleBadge role={role} />
          </div>
          <p className="mt-1.5 text-sm font-semibold text-petrol">
            {translate(locale, boss ? "dashboard.teamTitle" : "dashboard.workspaceTitle")}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {translate(locale, boss ? "dashboard.teamHint" : "dashboard.workspaceHint")}
          </p>
        </div>
      </div>

      {canApprove && <PendingActionsCard pendingLeave={pendingLeave} pendingCorrections={pendingCorrections} />}

      <ClockSessionProvider
        initial={{
          status: clockStatus.status,
          clockInTime: clockStatus.openEntry?.clockIn.toISOString() ?? null,
          breakSince: clockStatus.onBreakSince?.toISOString() ?? null,
          completedBreakSecondsOnOpen: worked.completedBreakSecondsOnOpen,
        }}
      >
        <ClockWidget />

        <WorkedHoursKpis
          closedSecondsToday={worked.closedSecondsToday}
          closedSecondsWeek={worked.closedSecondsWeek}
          closedSecondsMonth={worked.closedSecondsMonth}
          vacation={vacation}
        />
      </ClockSessionProvider>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{translate(locale, "dashboard.hoursChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyHoursChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {translate(locale, canViewTeam ? "dashboard.upcomingTeamLeave" : "dashboard.upcomingLeave")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingLeave items={upcomingLeave} showName={canViewTeam} />
          </CardContent>
        </Card>
      </div>

      {canViewTeam && (
        <Card>
          <CardHeader>
            <CardTitle>{translate(locale, "dashboard.teamAvailability")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamAvailability members={teamAvailability} />
          </CardContent>
        </Card>
      )}

      {boss && <AdminQuickLinks employeeCount={employeeCount} />}

      <RoleCapabilitiesCard role={role} capabilities={roleView.capabilities} />
    </div>
  );
}
