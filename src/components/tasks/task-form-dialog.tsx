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

export interface TaskFormOption {
  id: string;
  label: string;
}

export function TaskFormDialog({
  employees,
  projects,
}: {
  employees: TaskFormOption[];
  projects: TaskFormOption[];
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: "MEDIUM",
      status: "TODO",
    },
  });

  async function onSubmit(data: TaskInput) {
    startTransition(async () => {
      const result = await createTask({
        ...data,
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
          <Plus className="h-4 w-4" /> {t("tasks.assign")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("tasks.assignTitle")}</DialogTitle>
          <DialogDescription>{t("tasks.assignDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("tasks.field.title")}</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{t("tasks.field.description")}</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("tasks.field.assignTo")}</Label>
              <Controller
                control={control}
                name="assigneeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.selectTeammate")} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assigneeId && <p className="text-xs text-danger">{errors.assigneeId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t("tasks.field.project")}</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("ph.optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("tasks.field.noProject")}</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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
              {t("tasks.assignAction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
