import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getRoleView } from "@/lib/role-views";
import { getVisibleEmployeeIds, leaveEmployeeIdsWhere } from "@/lib/role-scope";
import { resolveTeamView } from "@/lib/team-view";
import { AttendanceCalendar, type AttendanceDay } from "@/components/attendance/attendance-calendar";
import { CorrectionApprovals, type PendingCorrection } from "@/components/attendance/correction-approvals";
import { TeamMemberSelect } from "@/components/layout/team-member-select";
import { RoleBadge } from "@/components/layout/role-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate, formatDuration } from "@/lib/utils";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const selfEmployeeId = session.user.employeeId;
  if (!selfEmployeeId) redirect("/dashboard");

  const { employeeId: requestedId } = await searchParams;
  const role = session.user.role;
  const roleView = getRoleView(role);
  const canApprove = hasPermission(role, "ATTENDANCE_EDIT");

  const view = await resolveTeamView({
    role,
    selfEmployeeId,
    requestedId,
  });
  const employeeId = view.viewedEmployeeId;
  const visibleIds = await getVisibleEmployeeIds(prisma, role, selfEmployeeId);

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const yearEnd = new Date(new Date().getFullYear(), 11, 31);

  const [attendances, pendingCorrections] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId, date: { gte: yearStart, lte: yearEnd } },
      orderBy: { date: "desc" },
    }),
    canApprove
      ? prisma.correctionRequest.findMany({
          where: { status: "PENDING", ...leaveEmployeeIdsWhere(visibleIds) },
          include: { employee: true, attendance: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const days: AttendanceDay[] = attendances.map((a) => ({
    date: a.date.toISOString().slice(0, 10),
    status: a.status as AttendanceDay["status"],
  }));

  const corrections: PendingCorrection[] = pendingCorrections.map((c) => ({
    id: c.id,
    employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
    date: c.attendance.date,
    requestedClockIn: c.requestedClockIn,
    requestedClockOut: c.requestedClockOut,
    reason: c.reason,
  }));

  const recentWithHours = attendances
    .filter((a) => a.totalWorkedMinutes > 0 || a.status === "PRESENT")
    .slice(0, 14);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
            <RoleBadge role={role} />
          </div>
          <p className="text-sm text-muted-foreground">
            {view.isSelf ? roleView.pageCopy.attendance : `Attendance for ${view.viewedName}.`}
          </p>
        </div>
        {view.canViewTeam && <TeamMemberSelect members={view.members} value={employeeId} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{view.isSelf ? "Your calendar" : `${view.viewedName}'s calendar`}</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceCalendar days={days} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily hours</CardTitle>
        </CardHeader>
        <CardContent>
          {recentWithHours.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No worked days recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Worked</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Overtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWithHours.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{formatDate(a.date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.status}</TableCell>
                    <TableCell className="font-medium">{formatDuration(a.totalWorkedMinutes * 60)}</TableCell>
                    <TableCell>{formatDuration(a.breakMinutes * 60)}</TableCell>
                    <TableCell>
                      {a.overtimeMinutes > 0 ? formatDuration(a.overtimeMinutes * 60) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canApprove && (
        <Card>
          <CardHeader>
            <CardTitle>Pending correction requests</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrectionApprovals items={corrections} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
