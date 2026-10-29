"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/app-toast";
import { Loader2, Plus } from "lucide-react";
import { z } from "zod";
import { TaskPriority } from "@prisma/client";
import { createSubtask } from "@/actions/tasks";
import { useLocale } from "@/components/layout/locale-provider";
import { TASK_PRIORITIES, taskPriorityKey } from "@/lib/i18n/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const subtaskFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  priority: z.nativeEnum(TaskPriority),
  dueDate: z.coerce.date().optional().nullable(),
  estimatedHours: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number().min(0.25).max(500).nullable().optional(),
  ),
});

type SubtaskFormInput = z.infer<typeof subtaskFormSchema>;

export function SubtaskFormDialog({
  parentId,
  parentTitle,
  defaultPriority,
}: {
  parentId: string;
  parentTitle: string;
  defaultPriority: TaskPriority;
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
  } = useForm<SubtaskFormInput>({
    resolver: zodResolver(subtaskFormSchema),
    defaultValues: { priority: defaultPriority, description: "" },
  });

  function onSubmit(data: SubtaskFormInput) {
    startTransition(async () => {
      const result = await createSubtask({
        parentId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ?? null,
        estimatedHours: data.estimatedHours ?? null,
      });
      if (result.success) {
        toast.success(result.message);
        reset({ priority: defaultPriority, description: "", title: "" });
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t("tasks.addSubtask")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("tasks.addSubtaskTitle")}</DialogTitle>
            <DialogDescription>{t("tasks.addSubtaskHint", { name: parentTitle })}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`subtask-title-${parentId}`}>{t("tasks.field.title")}</Label>
              <Input id={`subtask-title-${parentId}`} {...register("title")} />
              {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`subtask-description-${parentId}`}>{t("tasks.field.description")}</Label>
              <Textarea id={`subtask-description-${parentId}`} rows={3} {...register("description")} />
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
                <Label htmlFor={`subtask-due-${parentId}`}>{t("tasks.field.due")}</Label>
                <Input
                  id={`subtask-due-${parentId}`}
                  type="date"
                  {...register("dueDate", { setValueAs: (value) => (value ? new Date(value) : null) })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
                <Label htmlFor={`subtask-hours-${parentId}`}>{t("tasks.field.estimate")}</Label>
                <Input
                  id={`subtask-hours-${parentId}`}
                  type="number"
                  step="0.25"
                  min={0.25}
                  {...register("estimatedHours")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || isPending}>
                {(isSubmitting || isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("tasks.addSubtask")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
