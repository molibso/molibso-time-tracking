import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { visibleProjectWhere, visibleTaskWhere } from "@/lib/project-access";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { Card, CardContent } from "@/components/ui/card";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";

export default async function MeetingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/dashboard");

  const locale = await getLocale();
  const admin = isAdmin(session.user.role);

  const [meetings, projects, employees, timeTotals, activeTimer] = await Promise.all([
    prisma.task.findMany({
      where: { parentId: null, kind: "MEETING", ...visibleTaskWhere(employeeId, admin) },
      include: {
        project: { select: { name: true } },
        assignee: { select: { firstName: true, lastName: true } },
        assignments: { include: { employee: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { status: { in: ["PLANNING", "ACTIVE"] }, ...visibleProjectWhere(employeeId, admin) },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: { firstName: "asc" },
    }),
    prisma.taskTimeEntry.groupBy({
      by: ["taskId"],
      where: { endedAt: { not: null } },
      _sum: { durationSeconds: true },
    }),
    prisma.taskTimeEntry.findFirst({
      where: { employeeId, endedAt: null },
      select: { taskId: true, startedAt: true },
    }),
  ]);

  const loggedByTask = new Map(timeTotals.map((row) => [row.taskId, row._sum.durationSeconds ?? 0]));

  const rows = meetings.map((meeting) => {
    const names = meeting.assignments.map((row) => `${row.employee.firstName} ${row.employee.lastName}`);
    const assigneeName =
      names.length > 0
        ? names.join(", ")
        : meeting.assignee
          ? `${meeting.assignee.firstName} ${meeting.assignee.lastName}`
          : null;
    const canTrack =
      meeting.status !== "DONE" &&
      (meeting.assigneeId === employeeId || meeting.assignments.some((row) => row.employeeId === employeeId));
    return {
      id: meeting.id,
      title: meeting.title,
      projectName: meeting.project?.name ?? null,
      assigneeName,
      loggedSeconds: loggedByTask.get(meeting.id) ?? 0,
      isTimerActive: activeTimer?.taskId === meeting.id,
      timerStartedAt: activeTimer?.taskId === meeting.id ? activeTimer.startedAt.toISOString() : null,
      canTrackTime: canTrack,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "meetings.title")}</h1>
          <p className="text-base text-muted-foreground">{translate(locale, "meetings.subtitle")}</p>
        </div>
        <TaskFormDialog
          intent="meeting"
          defaultAssigneeId={employeeId}
          employees={employees.map((person) => ({ id: person.id, label: `${person.firstName} ${person.lastName}` }))}
          projects={projects.map((project) => ({ id: project.id, label: project.name }))}
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          <MeetingsList rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
