"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListTodo } from "lucide-react";
import { updateTaskStatus } from "@/actions/tasks";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { TaskTimerButton } from "@/components/tasks/task-timer-button";
import type { TaskRow } from "@/components/tasks/task-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { calendarDate, cn, formatDate } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";
import { TASK_STATUSES, taskPriorityKey, taskStatusKey } from "@/lib/i18n/labels";

const PRIORITY_VARIANT: Record<string, "default" | "warning" | "danger" | "muted"> = {
  LOW: "muted",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "danger",
};

const COLUMN_ACCENT: Record<string, string> = {
  TODO: "border-t-muted-foreground/40",
  IN_PROGRESS: "border-t-petrol",
  IN_REVIEW: "border-t-warning",
  DONE: "border-t-success",
};

function isOverdue(dueDate: string, status: string): boolean {
  if (status === "DONE") return false;
  const due = calendarDate(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function TaskBoard({
  rows,
  projectFilterId = null,
}: {
  rows: TaskRow[];
  projectFilterId?: string | null;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [localRows, setLocalRows] = useState(rows);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [didDrag, setDidDrag] = useState(false);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const scopedRows = useMemo(
    () => (projectFilterId ? localRows.filter((task) => task.projectId === projectFilterId) : localRows),
    [localRows, projectFilterId],
  );

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      scopedRows.filter((task) => {
        if (!needle) return true;
        const haystack = [task.title, task.description, task.assigneeName, task.projectName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      }),
    [scopedRows, needle],
  );

  const byStatus = useMemo(() => {
    const map: Record<string, TaskRow[]> = {};
    for (const status of TASK_STATUSES) map[status] = [];
    for (const task of visible) {
      (map[task.status] ??= []).push(task);
    }
    return map;
  }, [visible]);

  function moveTask(taskId: string, status: string) {
    const task = localRows.find((row) => row.id === taskId);
    if (!task || task.status === status || !task.canEdit) return;

    setLocalRows((prev) => prev.map((row) => (row.id === taskId ? { ...row, status } : row)));

    startTransition(async () => {
      const result = await updateTaskStatus({ id: taskId, status: status as (typeof TASK_STATUSES)[number] });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        setLocalRows(rows);
        toast.error(result.error);
      }
    });
  }

  const detailTask = detailId ? rows.find((row) => row.id === detailId) ?? null : null;

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-medium">{t("tasks.empty")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("tasks.emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TaskDetailDialog
        task={detailTask}
        open={detailId != null && detailTask != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("tasks.boardMoveHint")}</p>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("tasks.search")}
          className="h-8 w-full sm:w-56"
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-border py-10 text-center text-sm text-muted-foreground">
          {t("tasks.noMatch")}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {TASK_STATUSES.map((status) => {
            const key = taskStatusKey(status);
            const columnTasks = byStatus[status] ?? [];
            const isOver = overStatus === status;
            return (
              <div
                key={status}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border border-border border-t-4 bg-muted/30",
                  COLUMN_ACCENT[status],
                  isOver && "ring-2 ring-petrol/30",
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverStatus(status);
                }}
                onDragLeave={() => setOverStatus((current) => (current === status ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = event.dataTransfer.getData("text/task-id");
                  setOverStatus(null);
                  setDraggingId(null);
                  if (taskId) moveTask(taskId, status);
                }}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <h3 className="text-sm font-semibold">{key ? t(key) : status}</h3>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex min-h-[12rem] flex-1 flex-col gap-2 px-2 pb-2">
                  {columnTasks.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                      {t("tasks.boardEmpty")}
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const priorityKey = taskPriorityKey(task.priority);
                      const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false;
                      const dragging = draggingId === task.id;
                      return (
                        <article
                          key={task.id}
                          draggable={task.canEdit && !isPending}
                          onDragStart={(event) => {
                            if (!task.canEdit) {
                              event.preventDefault();
                              return;
                            }
                            setDidDrag(true);
                            event.dataTransfer.setData("text/task-id", task.id);
                            event.dataTransfer.effectAllowed = "move";
                            setDraggingId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setOverStatus(null);
                            window.setTimeout(() => setDidDrag(false), 0);
                          }}
                          onClick={() => {
                            if (didDrag) return;
                            setDetailId(task.id);
                          }}
                          className={cn(
                            "cursor-pointer rounded-lg border border-border bg-surface p-3 shadow-sm transition hover:border-petrol/30",
                            task.canEdit && "active:cursor-grabbing",
                            dragging && "opacity-40",
                            task.status === "DONE" && "opacity-80",
                          )}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 text-sm font-medium leading-snug" title={task.description || task.title}>
                                {task.title}
                              </p>
                              <Badge variant={PRIORITY_VARIANT[task.priority] ?? "default"} className="shrink-0">
                                {priorityKey ? t(priorityKey) : task.priority}
                              </Badge>
                            </div>

                            {(task.projectName || task.assigneeName) && (
                              <p className="truncate text-xs text-muted-foreground">
                                {[task.projectName, task.assigneeName ?? t("tasks.unassigned")].filter(Boolean).join(" · ")}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {task.dueDate && (
                                <span className={cn("tabular-nums", overdue && "font-medium text-danger")}>
                                  {formatDate(task.dueDate, locale)}
                                  {overdue ? ` · ${t("tasks.overdue")}` : ""}
                                </span>
                              )}
                              {task.estimatedHours != null && (
                                <span className="tabular-nums">{task.estimatedHours} h</span>
                              )}
                              {task.subtasks.length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <ListTodo className="h-3 w-3" />
                                  {t(
                                    task.subtasks.length === 1 ? "tasks.subtaskCount" : "tasks.subtaskCountPlural",
                                    { count: task.subtasks.length },
                                  )}
                                </span>
                              )}
                            </div>

                            <div
                              className="pt-0.5"
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <TaskTimerButton
                                taskId={task.id}
                                isActive={task.isTimerActive}
                                startedAt={task.timerStartedAt}
                                loggedSeconds={task.loggedSeconds}
                                canTrack={task.canTrackTime}
                              />
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
