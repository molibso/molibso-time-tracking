import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee } from "@/lib/api/auth";
import { formatDuration } from "@/lib/utils";
import {
  getClockStatus,
  getDashboardHours,
  getVacationBalance,
  getTeamAvailability,
  getUpcomingLeave,
  getWeeklyChartData,
} from "@/lib/queries/dashboard";
import { hasPermission } from "@/lib/rbac";
import { ok, serverError } from "@/lib/api/response";

/** GET /api/v1/dashboard — role-aware dashboard payload. */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;

    const canViewTeam = hasPermission(user.role, "EMPLOYEE_VIEW_ALL");
    const canApprove = hasPermission(user.role, "LEAVE_APPROVE");

    const [clockStatus, hours, chartData, vacation, team, leave, pendingLeave, pendingCorrections, pendingClaims] =
      await Promise.all([
        getClockStatus(user.employeeId),
        getDashboardHours(user.employeeId),
        getWeeklyChartData(user.employeeId),
        getVacationBalance(user.employeeId),
        canViewTeam ? getTeamAvailability({ all: true }) : Promise.resolve([]),
        getUpcomingLeave(canViewTeam ? { teamWide: true } : { employeeId: user.employeeId }),
        canApprove
          ? prisma.leaveRequest.count({ where: { status: "PENDING" } })
          : Promise.resolve(0),
        canApprove
          ? prisma.correctionRequest.count({ where: { status: "PENDING" } })
          : Promise.resolve(0),
        canApprove ? prisma.expenseClaim.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
      ]);

    return ok({
      clockStatus: {
        status: clockStatus.status,
        clockIn: clockStatus.openEntry?.clockIn ?? null,
        onBreakSince: clockStatus.onBreakSince,
      },
      hours: {
        todaySeconds: hours.today,
        weekSeconds: hours.week,
        monthSeconds: hours.month,
        today: formatDuration(hours.today),
        week: formatDuration(hours.week),
        month: formatDuration(hours.month),
      },
      chartData,
      vacation,
      teamAvailability: team,
      upcomingLeave: leave.map((l) => ({
        id: l.id,
        type: l.type,
        status: l.status,
        startDate: l.startDate,
        endDate: l.endDate,
        totalDays: l.totalDays,
        employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
      })),
      pendingApprovals: canApprove
        ? { leave: pendingLeave, corrections: pendingCorrections, claims: pendingClaims }
        : null,
    });
  } catch (err) {
    return serverError(err);
  }
}
