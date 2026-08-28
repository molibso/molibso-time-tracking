import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, isBoss } from "@/lib/rbac";
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
  const canViewTeam = hasPermission(role, "EMPLOYEE_VIEW_ALL");
  const canApprove = hasPermission(role, "LEAVE_APPROVE");
  const boss = isBoss(role);
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-muted-foreground">
          Your account isn&apos;t linked to an employee profile yet. Contact a boss.
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
              Welcome back, {employee?.firstName ?? "there"}
            </h1>
            <RoleBadge role={role} />
          </div>
          <p className="mt-1.5 text-sm font-semibold text-petrol">{roleView.dashboardTitle}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{roleView.dashboardSubtitle}</p>
        </div>
      </div>

      {canApprove && <PendingActionsCard pendingLeave={pendingLeave} pendingCorrections={pendingCorrections} />}

      <ClockWidget
        initialStatus={clockStatus.status}
        clockInTime={clockStatus.openEntry?.clockIn.toISOString() ?? null}
        breakSince={clockStatus.onBreakSince?.toISOString() ?? null}
      />

      <WorkedHoursKpis
        closedSecondsToday={worked.closedSecondsToday}
        closedSecondsWeek={worked.closedSecondsWeek}
        closedSecondsMonth={worked.closedSecondsMonth}
        openClockIn={worked.openClockIn}
        openBreakStartedAt={worked.openBreakStartedAt}
        completedBreakSecondsOnOpen={worked.completedBreakSecondsOnOpen}
        vacation={vacation}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hours worked — last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyHoursChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{canViewTeam ? "Upcoming team leave" : "Your upcoming leave"}</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingLeave items={upcomingLeave} showName={canViewTeam} />
          </CardContent>
        </Card>
      </div>

      {canViewTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Team availability</CardTitle>
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
