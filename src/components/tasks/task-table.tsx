"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { updateTaskStatus, deleteTask } from "@/actions/tasks";
import { stopTaskTimer } from "@/actions/task-time";
import { TaskTimerButton } from "@/components/tasks/task-timer-button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  estimatedHours: number | null;
  projectName: string | null;
  assigneeName: string | null;
  loggedSeconds: number;
  isTimerActive: boolean;
  timerStartedAt: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canTrackTime: boolean;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "muted"> = {
  TODO: "muted",
  IN_PROGRESS: "default",
  IN_REVIEW: "warning",
  DONE: "success",
};

const PRIORITY_VARIANT: Record<string, "default" | "warning" | "danger"> = {
  LOW: "default",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "danger",
};

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

export function TaskTable({ rows }: { rows: TaskRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeStatus(id: string, status: string) {
    startTransition(async () => {
      const result = await updateTaskStatus({ id, status: status as (typeof STATUSES)[number] });
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
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No tasks yet. Bosses can assign tasks from here.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Est.</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <p className="font-medium">{task.title}</p>
              {task.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{task.projectName ?? "—"}</TableCell>
            <TableCell className="text-sm">{task.assigneeName ?? "—"}</TableCell>
            <TableCell className="text-sm">
              {task.dueDate ? formatDate(task.dueDate) : "—"}
            </TableCell>
            <TableCell className="text-sm">
              {task.estimatedHours != null ? `${task.estimatedHours}h` : "—"}
            </TableCell>
            <TableCell>
              <TaskTimerButton
                taskId={task.id}
                isActive={task.isTimerActive}
                startedAt={task.timerStartedAt}
                loggedSeconds={task.loggedSeconds}
                canTrack={task.canTrackTime}
              />
            </TableCell>
            <TableCell>
              <Badge variant={PRIORITY_VARIANT[task.priority] ?? "default"} className="capitalize">
                {task.priority.toLowerCase()}
              </Badge>
            </TableCell>
            <TableCell>
              {task.canEdit ? (
                <Select
                  value={task.status}
                  onValueChange={(v) => changeStatus(task.id, v)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={STATUS_VARIANT[task.status] ?? "default"} className="capitalize">
                  {task.status.replace("_", " ").toLowerCase()}
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {task.canDelete && (
                <Button variant="ghost" size="icon" disabled={isPending} onClick={() => remove(task.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ActiveTaskTimerBanner({
  taskTitle,
  taskId,
}: {
  taskTitle: string;
  taskId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function stop() {
    startTransition(async () => {
      const result = await stopTaskTimer(taskId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <p className="text-sm">
        <span className="font-medium text-petrol">Timer running</span>
        <span className="text-muted-foreground"> — {taskTitle}</span>
      </p>
      <Button size="sm" variant="outline" disabled={isPending} onClick={stop}>
        Stop timer
      </Button>
    </div>
  );
}
