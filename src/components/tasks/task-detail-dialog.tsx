"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, ListTodo, StickyNote } from "lucide-react";
import { TaskPriority } from "@prisma/client";
import { updateTaskStatus } from "@/actions/tasks";
import { SubtaskFormDialog } from "@/components/tasks/subtask-form-dialog";
import { TaskTimerButton } from "@/components/tasks/task-timer-button";
import type { TaskRow } from "@/components/tasks/task-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { calendarDate, cn, formatDate, formatDuration } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";
import { TASK_STATUSES, taskPriorityKey, taskStatusKey } from "@/lib/i18n/labels";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "muted"> = {
  TODO: "muted",
  IN_PROGRESS: "default",
  IN_REVIEW: "warning",
  DONE: "success",
};

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

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: TaskRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();

  if (!task) return null;

  const priorityKey = taskPriorityKey(task.priority);
  const statusKey = taskStatusKey(task.status);
  const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl space-y-0 p-0">
        <div className="border-b border-border px-6 pb-4 pt-6">
          <DialogHeader className="mb-0 pr-8">
            <DialogTitle className="text-xl leading-snug">{task.title}</DialogTitle>
            <DialogDescription className={cn(!task.description && "sr-only")}>
              {task.description || t("tasks.detailHint")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant={PRIORITY_VARIANT[task.priority] ?? "default"}>
              {priorityKey ? t(priorityKey) : task.priority}
            </Badge>
            {task.canEdit ? (
              <Select value={task.status} onValueChange={(value) => changeStatus(task.id, value)} disabled={isPending}>
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
              <Badge variant={STATUS_VARIANT[task.status] ?? "default"}>
                {statusKey ? t(statusKey) : task.status}
              </Badge>
            )}
            <div className="ml-auto">
              <TaskTimerButton
                taskId={task.id}
                isActive={task.isTimerActive}
                startedAt={task.timerStartedAt}
                loggedSeconds={task.loggedSeconds}
                canTrack={task.canTrackTime}
              />
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">{t("tasks.meta.assignee")}</dt>
              <dd className="mt-0.5 font-medium">{task.assigneeName ?? t("tasks.unassigned")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("tasks.meta.due")}</dt>
              <dd className={cn("mt-0.5 font-medium tabular-nums", overdue && "text-danger")}>
                {task.dueDate ? formatDate(task.dueDate, locale) : "—"}
                {overdue && <span className="ml-1 text-xs font-normal">{t("tasks.overdue")}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("tasks.meta.estimate")}</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {task.estimatedHours != null ? `${task.estimatedHours} h` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("tasks.meta.project")}</dt>
              <dd className="mt-0.5 font-medium">{task.projectName ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                {t("tasks.subtasks")}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal tabular-nums text-muted-foreground">
                  {task.subtasks.length}
                </span>
              </h3>
              {task.canEdit && (
                <SubtaskFormDialog
                  parentId={task.id}
                  parentTitle={task.title}
                  defaultPriority={task.priority as TaskPriority}
                />
              )}
            </div>

            {task.subtasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                {t("tasks.noSubtasks")}
              </p>
            ) : (
              <ul className="space-y-2">
                {task.subtasks.map((subtask) => {
                  const subPriority = taskPriorityKey(subtask.priority);
                  const subStatus = taskStatusKey(subtask.status);
                  const subOverdue = subtask.dueDate ? isOverdue(subtask.dueDate, subtask.status) : false;
                  return (
                    <li
                      key={subtask.id}
                      className="rounded-xl border border-border bg-muted/20 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium leading-snug">{subtask.title}</p>
                          {subtask.description && (
                            <p className="text-xs text-muted-foreground">{subtask.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge variant={PRIORITY_VARIANT[subtask.priority] ?? "default"}>
                              {subPriority ? t(subPriority) : subtask.priority}
                            </Badge>
                            {subtask.canEdit ? (
                              <Select
                                value={subtask.status}
                                onValueChange={(value) => changeStatus(subtask.id, value)}
                                disabled={isPending}
                              >
                                <SelectTrigger className="h-7 w-[8.5rem] text-xs">
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
                              <Badge variant={STATUS_VARIANT[subtask.status] ?? "muted"}>
                                {subStatus ? t(subStatus) : subtask.status}
                              </Badge>
                            )}
                            {subtask.dueDate && (
                              <span className={cn("text-xs tabular-nums text-muted-foreground", subOverdue && "text-danger")}>
                                {formatDate(subtask.dueDate, locale)}
                                {subOverdue ? ` · ${t("tasks.overdue")}` : ""}
                              </span>
                            )}
                            {subtask.estimatedHours != null && (
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {subtask.estimatedHours} h
                              </span>
                            )}
                          </div>
                        </div>
                        <TaskTimerButton
                          taskId={subtask.id}
                          isActive={subtask.isTimerActive}
                          startedAt={subtask.timerStartedAt}
                          loggedSeconds={subtask.loggedSeconds}
                          canTrack={subtask.canTrackTime}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              {t("tasks.notes")}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal tabular-nums text-muted-foreground">
                {task.notes.length}
              </span>
            </h3>

            {task.notes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                {t("tasks.noDetails")}
              </p>
            ) : (
              <ul className="space-y-2">
                {task.notes.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-border border-l-4 border-l-petrol/50 bg-surface px-4 py-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">{formatDate(entry.startedAt, locale)}</span>
                      {entry.durationSeconds != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 tabular-nums">
                          <Clock className="h-3 w-3" />
                          {formatDuration(entry.durationSeconds)}
                        </span>
                      )}
                      {entry.subtaskTitle && (
                        <span className="rounded-full bg-petrol/10 px-2 py-0.5 text-petrol">
                          {entry.subtaskTitle}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{entry.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
