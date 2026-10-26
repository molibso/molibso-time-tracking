"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale } from "@/components/layout/locale-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { taskSchema, type TaskInput } from "@/lib/validations/tasks";
import { createTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TASK_PRIORITIES, taskPriorityKey } from "@/lib/i18n/labels";
import { PeoplePicker } from "@/components/tasks/people-picker";

export interface TaskFormOption {
  id: string;
  label: string;
}

export function TaskFormDialog({
  employees,
  projects,
  intent = "task",
  defaultAssigneeId,
}: {
  employees: TaskFormOption[];
  projects: TaskFormOption[];
  intent?: "task" | "meeting";
  defaultAssigneeId?: string;
}) {
  const isMeeting = intent === "meeting";
  const router = useRouter();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: "MEDIUM",
      status: "TODO",
      kind: isMeeting ? "MEETING" : "TASK",
      assigneeIds: defaultAssigneeId ? [defaultAssigneeId] : [],
    },
  });
  const kind = watch("kind");
  const meetingTask = isMeeting || kind === "MEETING";

  async function onSubmit(data: TaskInput) {
    startTransition(async () => {
      const result = await createTask({
        ...data,
        kind: isMeeting ? "MEETING" : data.kind,
        projectId: data.projectId || null,
        dueDate: data.dueDate || null,
        estimatedHours: data.estimatedHours || null,
      });
      if (result.success) {
        toast.success(result.message);
        reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {isMeeting ? t("meetings.create") : t("tasks.assign")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isMeeting ? t("meetings.createTitle") : t("tasks.assignTitle")}</DialogTitle>
          <DialogDescription>{isMeeting ? t("meetings.createDescription") : t("tasks.assignDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("tasks.field.title")}</Label>
            <Input id="title" placeholder={isMeeting ? t("meetings.placeholder") : undefined} {...register("title")} />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{t("tasks.field.description")}</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          {!isMeeting && (
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <label className="flex items-start gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#00425a]"
                    checked={field.value === "MEETING"}
                    onChange={(event) => field.onChange(event.target.checked ? "MEETING" : "TASK")}
                  />
                  <span>
                    <span className="font-medium">{t("tasks.field.meeting")}</span>
                    <span className="mt-0.5 block text-muted-foreground">{t("tasks.meetingHint")}</span>
                  </span>
                </label>
              )}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("tasks.field.assignTo")}</Label>
              <Controller
                control={control}
                name="assigneeIds"
                render={({ field }) => (
                  <PeoplePicker people={employees} value={field.value ?? []} onChange={field.onChange} />
                )}
              />
              {errors.assigneeIds && <p className="text-sm text-danger">{errors.assigneeIds.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{meetingTask ? t("meetings.project") : t("tasks.field.project")}</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("ph.optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      {!meetingTask && <SelectItem value="">{t("tasks.field.noProject")}</SelectItem>}
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && <p className="text-sm text-danger">{errors.projectId.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("tasks.field.priority")}</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((priority) => {
                        const key = taskPriorityKey(priority);
                        return (
                          <SelectItem key={priority} value={priority}>
                            {key ? t(key) : priority}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">{t("tasks.field.due")}</Label>
              <Input
                id="dueDate"
                type="date"
                {...register("dueDate", {
                  setValueAs: (v) => (v ? new Date(v) : null),
                })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
              <Label htmlFor="estimatedHours">{t("tasks.field.estimate")}</Label>
              <Input id="estimatedHours" type="number" step="0.5" min={0.25} {...register("estimatedHours")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || isPending}>
              {(isSubmitting || isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {isMeeting ? t("meetings.create") : t("tasks.assignAction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
