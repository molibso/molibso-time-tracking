import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClockStatus, getTodayWorkedBreakdown } from "@/lib/queries/dashboard";
import { resolveTeamView } from "@/lib/team-view";
import { ClockWidget } from "@/components/time-tracking/clock-widget";
import { CorrectionRequestDialog } from "@/components/time-tracking/correction-request-dialog";
import { TeamMemberSelect } from "@/components/layout/team-member-select";
import { WorkedHoursKpis } from "@/components/dashboard/worked-hours-kpis";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, formatDuration } from "@/lib/utils";

export default async function TimeTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const selfEmployeeId = session.user.employeeId;
  if (!selfEmployeeId) redirect("/dashboard");

  const { employeeId: requestedId } = await searchParams;
  const view = await resolveTeamView({
    role: session.user.role,
    selfEmployeeId,
    requestedId,
  });

  const employeeId = view.viewedEmployeeId;

  const [clockStatus, attendances, worked, vacation] = await Promise.all([
    getClockStatus(employeeId),
    prisma.attendance.findMany({
      where: { employeeId },
      include: { clockEntries: { include: { breaks: true } } },
      orderBy: { date: "desc" },
      take: 20,
    }),
    getTodayWorkedBreakdown(employeeId),
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { vacationAllowance: true },
    }),
  ]);

  const usedVacation = await prisma.leaveRequest.aggregate({
    where: { employeeId, type: "VACATION", status: "APPROVED" },
    _sum: { totalDays: true },
  });
  const allowance = vacation?.vacationAllowance ?? 20;
  const used = usedVacation._sum.totalDays ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time Tracking</h1>
          <p className="text-sm text-muted-foreground">
            {view.isSelf
              ? "Clock in, take breaks, and review your shift history."
              : `Reviewing shifts for ${view.viewedName}.`}
          </p>
        </div>
        {view.canViewTeam && <TeamMemberSelect members={view.members} value={employeeId} />}
      </div>

      <ClockWidget
        initialStatus={clockStatus.status}
        clockInTime={clockStatus.openEntry?.clockIn.toISOString() ?? null}
        breakSince={clockStatus.onBreakSince?.toISOString() ?? null}
        readOnly={!view.isSelf}
        personLabel={view.isSelf ? undefined : view.viewedName}
      />

      <WorkedHoursKpis
        closedSecondsToday={worked.closedSecondsToday}
        closedSecondsWeek={worked.closedSecondsWeek}
        closedSecondsMonth={worked.closedSecondsMonth}
        openClockIn={worked.openClockIn}
        openBreakStartedAt={worked.openBreakStartedAt}
        completedBreakSecondsOnOpen={worked.completedBreakSecondsOnOpen}
        vacation={{ remaining: Math.max(0, allowance - used), used, allowance }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{view.isSelf ? "Recent shifts" : `Recent shifts — ${view.viewedName}`}</CardTitle>
        </CardHeader>
        <CardContent>
          {attendances.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No shifts recorded yet{view.isSelf ? " — clock in to start tracking." : "."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Worked</TableHead>
                  <TableHead>Overtime</TableHead>
                  {view.isSelf && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{formatDate(a.date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.clockEntries.map((e, i) => (
                        <span key={e.id}>
                          {i > 0 && ", "}
                          {formatTime(e.clockIn, true)}–{e.clockOut ? formatTime(e.clockOut, true) : "now"}
                        </span>
                      ))}
                    </TableCell>
                    <TableCell>{formatDuration(a.breakMinutes * 60)}</TableCell>
                    <TableCell className="font-medium">{formatDuration(a.totalWorkedMinutes * 60)}</TableCell>
                    <TableCell>
                      {a.overtimeMinutes > 0 ? (
                        <Badge variant="warning">{formatDuration(a.overtimeMinutes * 60)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {view.isSelf && (
                      <TableCell>
                        <CorrectionRequestDialog attendanceId={a.id} date={formatDate(a.date)} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
