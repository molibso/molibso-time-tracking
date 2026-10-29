"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/app-toast";
import { ChevronDown, GripVertical, Search } from "lucide-react";
import { updateTaskStatus } from "@/actions/tasks";
import { ProjectEditButton } from "@/components/tasks/project-form-dialog";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { TaskTimerButton } from "@/components/tasks/task-timer-button";
import type { TaskFormOption } from "@/components/tasks/task-form-dialog";
import type { TaskRow } from "@/components/tasks/task-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-muted-foreground",
  IN_PROGRESS: "bg-petrol",
  IN_REVIEW: "bg-warning",
  DONE: "bg-success",
};

function isOverdue(dueDate: string, status: string): boolean {
  if (status === "DONE") return false;
  const due = calendarDate(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function initials(name: string | null): string {
  if (!name) return "?";
  const first = name.split(",")[0]?.trim() ?? name;
  return first
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | "loose" | null>(null);

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
    return {
      sections: projects.map((project) => ({
        project,
        tasks: byProject.get(project.id) ?? [],
      })),
      loose,
    };
  }, [projects, rows]);

  const activeId = selectedId ?? (groups.sections[0]?.project.id ?? (groups.loose.length > 0 ? "loose" : null));
  const active =
    activeId === "loose"
      ? { id: "loose" as const, name: t("tasks.field.noProject"), description: null, tasks: groups.loose, project: null }
      : (() => {
          const section = groups.sections.find((item) => item.project.id === activeId) ?? groups.sections[0];
          if (!section) return null;
          return {
            id: section.project.id,
            name: section.project.name,
            description: section.project.description,
            tasks: section.tasks,
            project: section.project,
          };
        })();

  const visibleTasks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const source = active?.tasks ?? [];
    if (!needle) return source;
    return source.filter((task) => task.title.toLowerCase().includes(needle) || (task.assigneeName ?? "").toLowerCase().includes(needle));
  }, [active, query]);

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
    <div className="overflow-hidden rounded-2xl border border-border bg-surface lg:grid lg:grid-cols-[16.5rem_1fr]">
      <TaskDetailDialog
        task={detailTask}
        open={detailId != null && detailTask != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
      <aside className="border-b border-border bg-muted/30 p-2 lg:border-b-0 lg:border-r">
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("tasks.projects")}</p>
        <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">
          {groups.sections.map(({ project, tasks }) => (
            <li key={project.id} className="shrink-0 lg:shrink">
              <ProjectNavItem
                name={project.name}
                tasks={tasks}
                selected={active?.id === project.id}
                onSelect={() => {
                  setSelectedId(project.id);
                  setQuery("");
                }}
              />
            </li>
          ))}
          {groups.loose.length > 0 && (
            <li className="shrink-0 lg:shrink">
              <ProjectNavItem
                name={t("tasks.field.noProject")}
                tasks={groups.loose}
                selected={active?.id === "loose"}
                onSelect={() => {
                  setSelectedId("loose");
                  setQuery("");
                }}
              />
            </li>
          )}
        </ul>
      </aside>

      <div className="min-w-0">
        {active && (
          <ProjectWorkspace
            name={active.name}
            description={active.description}
            tasks={visibleTasks}
            totalCount={active.tasks.length}
            query={query}
            onQuery={setQuery}
            headerExtra={
              active.project ? (
                <ProjectEditButton project={active.project} employees={employees} selfId={selfId} />
              ) : null
            }
            locale={locale}
            isPending={isPending}
            onOpen={setDetailId}
            onStatus={changeStatus}
          />
        )}
      </div>
    </div>
  );
}

function ProjectNavItem({
  name,
  tasks,
  selected,
  onSelect,
}: {
  name: string;
  tasks: TaskRow[];
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useLocale();
  const open = tasks.filter((task) => task.status !== "DONE").length;
  const progress = tasks.length === 0 ? 0 : Math.round(((tasks.length - open) / tasks.length) * 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-[11rem] items-center gap-2.5 rounded-xl px-2.5 py-2 text-left lg:min-w-0",
        selected ? "bg-surface shadow-soft" : "hover:bg-surface/70",
      )}
    >
      <span className={cn("h-8 w-1 shrink-0 rounded-full", selected ? "bg-petrol" : "bg-border")} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("tasks.open", { count: open })}</span>
          <span className="h-1 w-12 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-petrol" style={{ width: `${progress}%` }} />
          </span>
        </span>
      </span>
    </button>
  );
}

function ProjectWorkspace({
  name,
  description,
  tasks,
  totalCount,
  query,
  onQuery,
  headerExtra,
  locale,
  isPending,
  onOpen,
  onStatus,
}: {
  name: string;
  description: string | null;
  tasks: TaskRow[];
  totalCount: number;
  query: string;
  onQuery: (value: string) => void;
  headerExtra?: ReactNode;
  locale: Locale;
  isPending: boolean;
  onOpen: (id: string) => void;
  onStatus: (id: string, status: string) => void;
}) {
  const { t } = useLocale();
  const [overStatus, setOverStatus] = useState<string | null>(null);
  const done = tasks.filter((task) => task.status === "DONE").length;

  function dropOn(taskId: string, status: string) {
    setOverStatus(null);
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !task.canEdit || task.status === status) return;
    onStatus(taskId, status);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{name}</h3>
          {description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{t("tasks.doneOf", { done, count: query ? tasks.length : totalCount })}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder={t("tasks.search")}
              className="h-9 w-44 pl-8"
            />
          </div>
          {headerExtra}
        </div>
      </div>

      {totalCount === 0 ? (
        <p className="px-4 py-10 text-sm text-muted-foreground">{t("tasks.empty")}</p>
      ) : tasks.length === 0 ? (
        <p className="px-4 py-10 text-sm text-muted-foreground">{t("tasks.noMatch")}</p>
      ) : (
        <div>
          {TASK_STATUSES.map((status) => (
            <StatusGroup
              key={status}
              status={status}
              tasks={tasks.filter((task) => task.status === status)}
              locale={locale}
              isPending={isPending}
              over={overStatus === status}
              onOver={() => setOverStatus(status)}
              onDropTask={dropOn}
              onOpen={onOpen}
              onStatus={onStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusGroup({
  status,
  tasks,
  locale,
  isPending,
  over,
  onOver,
  onDropTask,
  onOpen,
  onStatus,
}: {
  status: (typeof TASK_STATUSES)[number];
  tasks: TaskRow[];
  locale: Locale;
  isPending: boolean;
  over: boolean;
  onOver: () => void;
  onDropTask: (id: string, status: string) => void;
  onOpen: (id: string) => void;
  onStatus: (id: string, status: string) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(status !== "DONE");
  const labelKey = taskStatusKey(status);

  return (
    <section
      className={cn("border-b border-border last:border-b-0", over && "bg-petrol/5")}
      onDragOver={(event) => {
        event.preventDefault();
        setOpen(true);
        onOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData("text/task-id");
        if (taskId) onDropTask(taskId, status);
      }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/40"
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", !open && "-rotate-90")} />
        <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
        <span className="text-sm font-semibold">{labelKey ? t(labelKey) : status}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{tasks.length}</span>
      </button>
      {open && (
        <ul>
          {tasks.length === 0 && (
            <li className="border-t border-dashed border-border px-4 py-3 text-xs text-muted-foreground">{t("tasks.boardEmpty")}</li>
          )}
          {tasks.map((task) => (
            <TaskLine
              key={task.id}
              task={task}
              locale={locale}
              isPending={isPending}
              onOpen={onOpen}
              onStatus={onStatus}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskLine({
  task,
  locale,
  isPending,
  onOpen,
  onStatus,
}: {
  task: TaskRow;
  locale: Locale;
  isPending: boolean;
  onOpen: (id: string) => void;
  onStatus: (id: string, status: string) => void;
}) {
  const { t } = useLocale();
  const priorityKey = taskPriorityKey(task.priority);
  const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false;
  return (
    <li
      className="flex flex-wrap items-center gap-3 border-t border-border/70 px-4 py-2.5 hover:bg-muted/30"
      draggable={task.canEdit && !isPending}
      onDragStart={(event) => {
        if (!task.canEdit) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/task-id", task.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      {task.canEdit && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />}
      <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpen(task.id)}>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-petrol/10 text-[11px] font-semibold text-petrol",
          )}
          title={task.assigneeName ?? t("tasks.unassigned")}
        >
          {initials(task.assigneeName)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {task.kind === "MEETING" && (
              <span className="mr-1.5 rounded-full bg-petrol/10 px-2 py-0.5 text-xs font-semibold text-petrol">
                {t("tasks.kind.meeting")}
              </span>
            )}
            <span className={cn(task.status === "DONE" && "text-muted-foreground line-through")}>{task.title}</span>
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="truncate">{task.assigneeName ?? t("tasks.unassigned")}</span>
            {task.subtasks.length > 0 && (
              <span>
                {t("tasks.subtasks")} {task.subtasks.filter((item) => item.status === "DONE").length}/{task.subtasks.length}
              </span>
            )}
            {task.dueDate && (
              <span className={cn("tabular-nums", overdue && "font-medium text-danger")}>
                {formatDate(task.dueDate, locale)}
                {overdue ? ` · ${t("tasks.overdue")}` : ""}
              </span>
            )}
          </span>
        </span>
      </button>
      <Badge variant={PRIORITY_VARIANT[task.priority] ?? "default"} className="hidden sm:inline-flex">
        {priorityKey ? t(priorityKey) : task.priority}
      </Badge>
      {task.canEdit ? (
        <Select value={task.status} onValueChange={(value) => onStatus(task.id, value)} disabled={isPending}>
          <SelectTrigger className="h-8 w-[8.5rem]">
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
      ) : null}
      <TaskTimerButton
        taskId={task.id}
        isActive={task.isTimerActive}
        startedAt={task.timerStartedAt}
        loggedSeconds={task.loggedSeconds}
        canTrack={task.canTrackTime}
      />
    </li>
  );
}
