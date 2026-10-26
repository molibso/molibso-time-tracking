"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTaskStatus } from "@/actions/tasks";
import { ProjectEditButton } from "@/components/tasks/project-form-dialog";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { TaskTimerButton } from "@/components/tasks/task-timer-button";
import type { TaskFormOption } from "@/components/tasks/task-form-dialog";
import type { TaskRow } from "@/components/tasks/task-table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { calendarDate, cn, formatDate } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";
import type { Locale } from "@/lib/i18n/messages";
import { TASK_STATUSES, taskPriorityKey, taskStatusKey } from "@/lib/i18n/labels";

const PRIORITY_VARIANT: Record<string, "default" | "warning" | "danger" | "muted"> = {
  LOW: "muted",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "danger",
};

function isOverdue(dueDate: string, status: string): boolean {
  if (status === "DONE") return false;
  const due = calendarDate(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function ProjectGroups({
  rows,
  projects,
  employees,
  selfId,
}: {
  rows: TaskRow[];
  projects: { id: string; name: string; description: string | null; taskCount: number; memberIds: string[] }[];
  employees: TaskFormOption[];
  selfId: string;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [detailId, setDetailId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byProject = new Map<string, TaskRow[]>();
    const loose: TaskRow[] = [];
    for (const task of rows) {
      if (!task.projectId) {
        loose.push(task);
        continue;
      }
      const list = byProject.get(task.projectId) ?? [];
      list.push(task);
      byProject.set(task.projectId, list);
    }
    const sections = projects.map((project) => ({
      project,
      tasks: byProject.get(project.id) ?? [],
    }));
    return { sections, loose };
  }, [projects, rows]);

  function changeStatus(id: string, status: string) {
    startTransition(async () => {
      const result = await updateTaskStatus({ id, status: status as (typeof TASK_STATUSES)[number] });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const detailTask = detailId ? rows.find((row) => row.id === detailId) ?? null : null;

  if (rows.length === 0 && projects.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-medium">{t("tasks.empty")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("tasks.emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TaskDetailDialog
        task={detailTask}
        open={detailId != null && detailTask != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
      {groups.sections.map(({ project, tasks }) => (
        <ProjectSection
          key={project.id}
          name={project.name}
          description={project.description}
          tasks={tasks}
          headerExtra={
            <ProjectEditButton
              project={project}
              employees={employees}
              selfId={selfId}
            />
          }
          locale={locale}
          isPending={isPending}
          onOpen={setDetailId}
          onStatus={changeStatus}
        />
      ))}
      {groups.loose.length > 0 && (
        <ProjectSection
          name={t("tasks.field.noProject")}
          description={null}
          tasks={groups.loose}
          locale={locale}
          isPending={isPending}
          onOpen={setDetailId}
          onStatus={changeStatus}
        />
      )}
    </div>
  );
}

function ProjectSection({
  name,
  description,
  tasks,
  headerExtra,
  locale,
  isPending,
  onOpen,
  onStatus,
}: {
  name: string;
  description: string | null;
  tasks: TaskRow[];
  headerExtra?: ReactNode;
  locale: Locale;
  isPending: boolean;
  onOpen: (id: string) => void;
  onStatus: (id: string, status: string) => void;
}) {
  const { t } = useLocale();
  const done = tasks.filter((task) => task.status === "DONE").length;
  const progress = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{name}</h3>
            {description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">
              {t("tasks.doneOf", { done, count: tasks.length })}
            </span>
            {headerExtra}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-petrol" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">{t("tasks.empty")}</p>
      ) : (
        <ul className="grid gap-px bg-border sm:grid-cols-2">
          {tasks.map((task) => {
            const priorityKey = taskPriorityKey(task.priority);
            const statusKey = taskStatusKey(task.status);
            const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false;
            return (
              <li key={task.id} className="flex flex-col gap-3 bg-surface px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => onOpen(task.id)}>
                    <p className={cn("font-medium leading-snug hover:text-petrol", task.status === "DONE" && "text-muted-foreground")}>
                      {task.kind === "MEETING" && (
                        <span className="mr-1.5 rounded-full bg-petrol/10 px-2 py-0.5 text-xs font-semibold text-petrol">
                          {t("tasks.kind.meeting")}
                        </span>
                      )}
                      {task.title}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {task.assigneeName ?? t("tasks.unassigned")}
                      {task.dueDate ? ` · ${formatDate(task.dueDate, locale)}` : ""}
                      {overdue ? ` · ${t("tasks.overdue")}` : ""}
                    </p>
                  </button>
                  <Badge variant={PRIORITY_VARIANT[task.priority] ?? "default"}>
                    {priorityKey ? t(priorityKey) : task.priority}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {task.canEdit ? (
                    <Select value={task.status} onValueChange={(value) => onStatus(task.id, value)} disabled={isPending}>
                      <SelectTrigger className="h-8 w-[9.5rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((status) => {
                          const key = taskStatusKey(status);
                          return (
                            <SelectItem key={status} value={status}>
                              {key ? t(key) : status}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="muted">{statusKey ? t(statusKey) : task.status}</Badge>
                  )}
                  <TaskTimerButton
                    taskId={task.id}
                    isActive={task.isTimerActive}
                    startedAt={task.timerStartedAt}
                    loggedSeconds={task.loggedSeconds}
                    canTrack={task.canTrackTime}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
