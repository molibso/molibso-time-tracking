import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getRoleView } from "@/lib/role-views";
import { RoleBadge } from "@/components/layout/role-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TaskTable, ActiveTaskTimerBanner, type TaskRow } from "@/components/tasks/task-table";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { ProjectFormDialog } from "@/components/tasks/project-form-dialog";
import { Badge } from "@/components/ui/badge";

export default async function TasksPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/dashboard");

  const role = session.user.role;
  const isBoss = hasPermission(role, "EMPLOYEE_MANAGE");
  const roleView = getRoleView(role);

  const [tasks, projects, employees, timeTotals, activeTimer] = await Promise.all([
    prisma.task.findMany({
      where: isBoss ? undefined : { assigneeId: employeeId },
      include: {
        project: { select: { name: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    isBoss
      ? prisma.project.findMany({
          where: { status: { in: ["PLANNING", "ACTIVE"] } },
          orderBy: { name: "asc" },
          include: { _count: { select: { tasks: true } } },
        })
      : Promise.resolve([]),
    isBoss
      ? prisma.employee.findMany({
          where: { status: "ACTIVE" },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
    prisma.taskTimeEntry.groupBy({
      by: ["taskId"],
      where: {
        endedAt: { not: null },
        ...(isBoss ? {} : { employeeId }),
      },
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

  const rows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    estimatedHours: t.estimatedHours,
    projectName: t.project?.name ?? null,
    assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : null,
    loggedSeconds: loggedByTask.get(t.id) ?? 0,
    isTimerActive: activeTimer?.taskId === t.id,
    timerStartedAt: activeTimer?.taskId === t.id ? activeTimer.startedAt.toISOString() : null,
    canEdit: isBoss || t.assigneeId === employeeId,
    canDelete: isBoss,
    canTrackTime: t.assigneeId === employeeId && t.status !== "DONE",
  }));

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: `${e.firstName} ${e.lastName}`,
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
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
            <RoleBadge role={role} />
            {openCount > 0 && <Badge variant="default">{openCount} open</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {isBoss
              ? "Assign and track project delivery across the team."
              : roleView.pageCopy.tasks ?? "Your assigned tasks and delivery dates."}
          </p>
        </div>
        {isBoss && (
          <div className="flex flex-wrap gap-2">
            <ProjectFormDialog />
            <TaskFormDialog employees={employeeOptions} projects={projectOptions} />
          </div>
        )}
      </div>

      {isBoss && projects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <Badge key={p.id} variant="outline" className="px-3 py-1">
              {p.name} · {p._count.tasks} task{p._count.tasks === 1 ? "" : "s"}
            </Badge>
          ))}
        </div>
      )}

      {activeTimer && (
        <ActiveTaskTimerBanner taskId={activeTimer.taskId} taskTitle={activeTimer.task.title} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isBoss ? "All tasks" : "My tasks"}</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
