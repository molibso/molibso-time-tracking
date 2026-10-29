import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { visibleProjectWhere, visibleTaskWhere } from "@/lib/project-access";
import { RoleBadge } from "@/components/layout/role-badge";
import { TasksView } from "@/components/tasks/tasks-view";
import { ActiveTaskTimerBanner, type TaskRow, type TaskSession } from "@/components/tasks/task-table";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { ProjectFormDialog } from "@/components/tasks/project-form-dialog";
import { Badge } from "@/components/ui/badge";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";

const sessionSelect = {
  id: true,
  note: true,
  startedAt: true,
  endedAt: true,
  durationSeconds: true,
  employeeId: true,
} as const;

function namesOf(task: {
  assignee: { firstName: string; lastName: string } | null;
  assignments: { employee: { firstName: string; lastName: string } }[];
}) {
  const fromAssignments = task.assignments.map((row) => `${row.employee.firstName} ${row.employee.lastName}`);
  if (fromAssignments.length > 0) return fromAssignments.join(", ");
  return task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null;
}

function assignedTo(
  task: { assigneeId: string | null; assignments: { employeeId: string }[] },
  employeeId: string,
) {
  return task.assigneeId === employeeId || task.assignments.some((row) => row.employeeId === employeeId);
}

export default async function TasksPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/dashboard");

  const role = session.user.role;
  const locale = await getLocale();
  const admin = isAdmin(role);

  const [tasks, projects, employees, timeTotals, activeTimer] = await Promise.all([
    prisma.task.findMany({
      where: { parentId: null, ...visibleTaskWhere(employeeId, admin) },
      include: {
        project: { select: { name: true } },
        assignee: { select: { firstName: true, lastName: true } },
        assignments: {
          include: { employee: { select: { firstName: true, lastName: true } } },
        },
        subtasks: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            estimatedHours: true,
            assigneeId: true,
            assignee: { select: { firstName: true, lastName: true } },
            assignments: { select: { employeeId: true } },
            timeEntries: {
              orderBy: { startedAt: "desc" },
              select: sessionSelect,
            },
          },
        },
        timeEntries: {
          orderBy: { startedAt: "desc" },
          select: sessionSelect,
        },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.project.findMany({
      where: { status: { in: ["PLANNING", "ACTIVE"] }, ...visibleProjectWhere(employeeId, admin) },
      orderBy: { name: "asc" },
      include: {
        members: { select: { employeeId: true } },
        _count: {
          select: {
            tasks: { where: { parentId: null } },
          },
        },
      },
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
      select: { taskId: true, startedAt: true, task: { select: { title: true } } },
    }),
  ]);

  const loggedByTask = new Map(
    timeTotals.map((t) => [t.taskId, t._sum.durationSeconds ?? 0]),
  );

  const rows: TaskRow[] = tasks.map((t) => {
    const sessions: TaskSession[] = [
      ...t.timeEntries
        .filter((entry) => entry.endedAt)
        .map((entry) => ({
          id: entry.id,
          startedAt: entry.startedAt.toISOString(),
          durationSeconds: entry.durationSeconds,
          note: entry.note,
          canCorrect: entry.employeeId === employeeId,
        })),
      ...t.subtasks.flatMap((subtask) =>
        subtask.timeEntries
          .filter((entry) => entry.endedAt)
          .map((entry) => ({
            id: entry.id,
            startedAt: entry.startedAt.toISOString(),
            durationSeconds: entry.durationSeconds,
            note: entry.note,
            subtaskTitle: subtask.title,
            canCorrect: entry.employeeId === employeeId,
          })),
      ),
    ].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

    return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    estimatedHours: t.estimatedHours,
    kind: t.kind,
    projectId: t.projectId,
    projectName: t.project?.name ?? null,
    assigneeName: namesOf(t),
    loggedSeconds:
      (loggedByTask.get(t.id) ?? 0) +
      t.subtasks.reduce((sum, subtask) => sum + (loggedByTask.get(subtask.id) ?? 0), 0),
    isTimerActive: activeTimer?.taskId === t.id,
    timerStartedAt: activeTimer?.taskId === t.id ? activeTimer.startedAt.toISOString() : null,
    canEdit: true,
    canDelete: true,
    canTrackTime: (admin || assignedTo(t, employeeId)) && t.status !== "DONE",
    notes: sessions
      .filter((entry) => entry.note)
      .map((entry) => ({
        id: entry.id,
        note: entry.note as string,
        startedAt: entry.startedAt,
        durationSeconds: entry.durationSeconds,
        subtaskTitle: entry.subtaskTitle,
      })),
    sessions,
    subtasks: t.subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      description: subtask.description,
      status: subtask.status,
      priority: subtask.priority,
      dueDate: subtask.dueDate?.toISOString() ?? null,
      estimatedHours: subtask.estimatedHours,
      assigneeName: subtask.assignee ? `${subtask.assignee.firstName} ${subtask.assignee.lastName}` : null,
      loggedSeconds: loggedByTask.get(subtask.id) ?? 0,
      isTimerActive: activeTimer?.taskId === subtask.id,
      timerStartedAt: activeTimer?.taskId === subtask.id ? activeTimer.startedAt.toISOString() : null,
      canTrackTime: (admin || assignedTo(subtask, employeeId)) && subtask.status !== "DONE",
      canEdit: true,
    })),
    };
  });

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: `${e.firstName} ${e.lastName}`,
  }));

  const projectChips = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    taskCount: p._count.tasks,
    memberIds: p.members.length > 0 ? p.members.map((member) => member.employeeId) : employees.map((person) => person.id),
  }));

  const projectOptions = projects.map((p) => ({
    id: p.id,
    label: p.name,
  }));

  const openCount = rows.filter((r) => r.status !== "DONE").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "tasks.title")}</h1>
            <RoleBadge role={role} />
            {openCount > 0 && <Badge variant="default">{translate(locale, "tasks.open", { count: openCount })}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{translate(locale, "tasks.subtitleTeam")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProjectFormDialog employees={employeeOptions} selfId={employeeId} />
          <TaskFormDialog employees={employeeOptions} projects={projectOptions} defaultAssigneeId={employeeId} />
        </div>
      </div>

      {activeTimer && (
        <ActiveTaskTimerBanner taskId={activeTimer.taskId} taskTitle={activeTimer.task.title} />
      )}

      <TasksView rows={rows} projects={projectChips} employees={employeeOptions} selfId={employeeId} />
    </div>
  );
}
