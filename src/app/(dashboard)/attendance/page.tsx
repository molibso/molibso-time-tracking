import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveRole, hasPermission } from "@/lib/rbac";
import { getVisibleEmployeeIds, leaveEmployeeIdsWhere } from "@/lib/role-scope";
import { resolveTeamView } from "@/lib/team-view";
import { AttendanceCalendar, type AttendanceDay } from "@/components/attendance/attendance-calendar";
import { CorrectionApprovals, type PendingCorrection } from "@/components/attendance/correction-approvals";
import { TeamMemberSelect } from "@/components/layout/team-member-select";
import { RoleBadge } from "@/components/layout/role-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate, formatDuration } from "@/lib/utils";
import { FULL_DAY_SECONDS, balanceSeconds, formatBalance } from "@/lib/day-balance";
import { sumBreakSeconds, sumWorkedSeconds } from "@/lib/worked-time";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";

function calendarDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

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
  const locale = await getLocale();
  const boss = effectiveRole(role) === "ADMIN";
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
      include: { clockEntries: { include: { breaks: true } } },
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
    date: calendarDateKey(a.date),
    status: a.status as AttendanceDay["status"],
    workedSeconds: a.clockEntries.length > 0 ? sumWorkedSeconds(a.clockEntries) : Math.max(0, a.totalWorkedMinutes) * 60,
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
            <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "attendance.title")}</h1>
            <RoleBadge role={role} />
          </div>
          <p className="text-sm text-muted-foreground">
            {view.isSelf
              ? translate(locale, boss ? "attendance.subtitleBoss" : "attendance.subtitle")
              : translate(locale, "attendance.forName", { name: view.viewedName })}
          </p>
        </div>
        {view.canViewTeam && <TeamMemberSelect members={view.members} value={employeeId} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {view.isSelf
              ? translate(locale, "attendance.yourCalendar")
              : translate(locale, "attendance.theirCalendar", { name: view.viewedName })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceCalendar days={days} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translate(locale, "attendance.dailyHours")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentWithHours.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{translate(locale, "attendance.none")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translate(locale, "attendance.date")}</TableHead>
                  <TableHead>{translate(locale, "attendance.status")}</TableHead>
                  <TableHead>{translate(locale, "attendance.worked")}</TableHead>
                  <TableHead>{translate(locale, "attendance.break")}</TableHead>
                  <TableHead>{translate(locale, "attendance.balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWithHours.map((a) => {
                  const workedSeconds = a.clockEntries.length > 0 ? sumWorkedSeconds(a.clockEntries) : Math.max(0, a.totalWorkedMinutes) * 60;
                  const breakSeconds = a.clockEntries.length > 0 ? sumBreakSeconds(a.clockEntries) : Math.max(0, a.breakMinutes) * 60;
                  return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium tabular-nums">{formatDate(a.date, locale)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.status}</TableCell>
                    <TableCell className="font-medium">{formatDuration(workedSeconds)}</TableCell>
                    <TableCell>{formatDuration(breakSeconds)}</TableCell>
                    <TableCell className={workedSeconds >= FULL_DAY_SECONDS ? "font-medium text-success" : "font-medium text-danger"}>
                      {workedSeconds > 0 ? formatBalance(balanceSeconds(workedSeconds)) : "—"}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canApprove && (
        <Card>
          <CardHeader>
            <CardTitle>{translate(locale, "attendance.correctionsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrectionApprovals items={corrections} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
