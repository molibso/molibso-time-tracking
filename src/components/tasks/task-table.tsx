"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { updateTaskStatus, deleteTask } from "@/actions/tasks";
import { stopTaskTimer } from "@/actions/task-time";
import { SessionNoteDialog } from "@/components/tasks/session-note-dialog";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { TaskTimerButton } from "@/components/tasks/task-timer-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { calendarDate, cn, formatDate } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";
import { TASK_STATUSES, taskPriorityKey, taskStatusKey } from "@/lib/i18n/labels";

export interface TaskNote {
  id: string;
  note: string;
  startedAt: string;
  durationSeconds: number | null;
  subtaskTitle?: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  estimatedHours: number | null;
  assigneeName: string | null;
  loggedSeconds: number;
  isTimerActive: boolean;
  timerStartedAt: string | null;
  canTrackTime: boolean;
  canEdit: boolean;
}

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  estimatedHours: number | null;
  projectId: string | null;
  projectName: string | null;
  assigneeName: string | null;
  loggedSeconds: number;
  isTimerActive: boolean;
  timerStartedAt: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canTrackTime: boolean;
  notes: TaskNote[];
  subtasks: TaskSubtask[];
}

const PAGE_SIZE = 8;

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

export function TaskTable({
  rows,
  projectFilterId = null,
}: {
  rows: TaskRow[];
  projectFilterId?: string | null;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const scopedRows = useMemo(
    () => (projectFilterId ? rows.filter((task) => task.projectId === projectFilterId) : rows),
    [rows, projectFilterId],
  );

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

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteTask(id);
      if (result.success) {
        toast.success(result.message);
        if (detailId === id) setDetailId(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      scopedRows.filter((task) => {
        if (statusFilter !== "ALL" && task.status !== statusFilter) return false;
        if (!needle) return true;
        const haystack = [task.title, task.description, task.assigneeName, task.projectName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      }),
    [scopedRows, statusFilter, needle],
  );

  useEffect(() => {
    setPage(1);
  }, [statusFilter, needle, projectFilterId]);

  const counts = useMemo(() => {
    const next: Record<string, number> = { ALL: scopedRows.length };
    for (const status of TASK_STATUSES) next[status] = 0;
    for (const task of scopedRows) next[task.status] = (next[task.status] ?? 0) + 1;
    return next;
  }, [scopedRows]);

  const detailTask = detailId ? rows.find((row) => row.id === detailId) ?? null : null;

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-medium">{t("tasks.empty")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("tasks.emptyHint")}</p>
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = visible.slice(pageStart, pageStart + PAGE_SIZE);
  const filters = ["ALL", ...TASK_STATUSES];

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
        <div className="flex flex-wrap gap-1.5">
          {filters.map((status) => {
            const key = status === "ALL" ? null : taskStatusKey(status);
            const label = status === "ALL" ? t("tasks.filterAll") : key ? t(key) : status;
            const selected = statusFilter === status;
            return (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                className="h-8"
                onClick={() => setStatusFilter(status)}
              >
                {label}
                <span className={cn("tabular-nums", selected ? "opacity-80" : "text-muted-foreground")}>
                  {counts[status] ?? 0}
                </span>
              </Button>
            );
          })}
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("tasks.search")}
          className="h-8 w-full sm:w-56"
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-border py-10 text-center text-sm text-muted-foreground">{t("tasks.noMatch")}</p>
      ) : (
        <>
          <div className="overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[58rem] caption-bottom text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("tasks.field.title")}</th>
                  <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("tasks.meta.project")}</th>
                  <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("tasks.meta.assignee")}</th>
                  <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("tasks.meta.due")}</th>
                  <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("tasks.meta.estimate")}</th>
                  <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("tasks.meta.time")}</th>
                  <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("tasks.field.priority")}</th>
                  <th className="h-9 px-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("leave.col.status")}</th>
                  <th className="h-9 w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((task) => {
                  const priorityKey = taskPriorityKey(task.priority);
                  const statusKey = taskStatusKey(task.status);
                  const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false;
                  return (
                    <tr
                      key={task.id}
                      className={cn(
                        "border-b border-border hover:bg-surface-hover",
                        task.status === "DONE" && "text-muted-foreground",
                      )}
                    >
                      <td className="max-w-[18rem] px-3 py-2">
                        <button
                          type="button"
                          className="min-w-0 w-full text-left"
                          onClick={() => setDetailId(task.id)}
                        >
                          <p className="truncate font-medium text-foreground hover:text-petrol" title={task.description || task.title}>
                            {task.title}
                          </p>
                          {(task.notes.length > 0 || task.subtasks.length > 0) && (
                            <p className="truncate text-xs text-muted-foreground">
                              {[
                                task.subtasks.length === 1
                                  ? t("tasks.subtaskCount", { count: task.subtasks.length })
                                  : task.subtasks.length > 1
                                    ? t("tasks.subtaskCountPlural", { count: task.subtasks.length })
                                    : null,
                                task.notes.length === 1
                                  ? t("tasks.noteCount", { count: task.notes.length })
                                  : task.notes.length > 1
                                    ? t("tasks.noteCountPlural", { count: task.notes.length })
                                    : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </button>
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2 text-muted-foreground">
                        {task.projectName ?? "—"}
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2">{task.assigneeName ?? t("tasks.unassigned")}</td>
                      <td className={cn("whitespace-nowrap px-3 py-2 tabular-nums", overdue && "font-medium text-danger")}>
                        {task.dueDate ? formatDate(task.dueDate, locale) : "—"}
                        {overdue && <span className="ml-1.5 text-xs font-normal">{t("tasks.overdue")}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        {task.estimatedHours != null ? `${task.estimatedHours} h` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <TaskTimerButton
                          taskId={task.id}
                          isActive={task.isTimerActive}
                          startedAt={task.timerStartedAt}
                          loggedSeconds={task.loggedSeconds}
                          canTrack={task.canTrackTime}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={PRIORITY_VARIANT[task.priority] ?? "default"}>
                          {priorityKey ? t(priorityKey) : task.priority}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
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
                          <Badge variant={STATUS_VARIANT[task.status] ?? "default"}>{statusKey ? t(statusKey) : task.status}</Badge>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        {task.canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={isPending}
                            aria-label={t("tasks.delete")}
                            onClick={() => remove(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="tabular-nums text-muted-foreground">
              {t("tasks.range", {
                from: pageStart + 1,
                to: pageStart + pageRows.length,
                total: visible.length,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                {t("tasks.prev")}
              </Button>
              <span className="tabular-nums text-muted-foreground">
                {t("tasks.page", { page: safePage, pages: pageCount })}
              </span>
              <Button type="button" size="sm" variant="outline" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                {t("tasks.next")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ActiveTaskTimerBanner({
  taskTitle,
  taskId,
}: {
  taskTitle: string;
  taskId: string;
}) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteEntryId, setNoteEntryId] = useState<string | null>(null);

  function stop() {
    startTransition(async () => {
      const result = await stopTaskTimer(taskId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.entryId) {
        setNoteEntryId(result.entryId);
        setNoteOpen(true);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <SessionNoteDialog open={noteOpen} entryId={noteEntryId} onOpenChange={setNoteOpen} />
      <p className="text-sm">
        <span className="font-medium text-petrol">{t("tasks.timerRunning")}</span>
        <span className="text-muted-foreground"> — {taskTitle}</span>
      </p>
      <Button size="sm" variant="outline" disabled={isPending} onClick={stop}>
        {t("tasks.stopTimer")}
      </Button>
    </div>
  );
}
