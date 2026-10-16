"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { projectSchema, type ProjectInput } from "@/lib/validations/tasks";
import { createProject, deleteProject, updateProject } from "@/actions/tasks";
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
import { useLocale } from "@/components/layout/locale-provider";

export function ProjectFormDialog({
  project,
  trigger,
  onDeleted,
}: {
  project?: { id: string; name: string; description: string | null };
  trigger?: React.ReactNode;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const isEdit = Boolean(project);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: project?.name ?? "",
        description: project?.description ?? "",
      });
      setConfirmOpen(false);
    }
  }, [open, project, reset]);

  async function onSubmit(data: ProjectInput) {
    startTransition(async () => {
      const result = isEdit && project
        ? await updateProject({ id: project.id, ...data })
        : await createProject(data);
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

  function confirmDelete() {
    if (!project) return;
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result.success) {
        toast.success(result.message);
        setConfirmOpen(false);
        setOpen(false);
        onDeleted?.(project.id);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline">
              <Plus className="h-4 w-4" /> {t("tasks.newProject")}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? t("tasks.editProject") : t("tasks.newProject")}</DialogTitle>
            <DialogDescription>
              {isEdit ? t("tasks.editProjectHint") : t("tasks.newProjectHint")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`project-name-${project?.id ?? "new"}`}>{t("tasks.field.project")}</Label>
              <Input id={`project-name-${project?.id ?? "new"}`} {...register("name")} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`project-description-${project?.id ?? "new"}`}>{t("tasks.field.description")}</Label>
              <Textarea id={`project-description-${project?.id ?? "new"}`} rows={3} {...register("description")} />
            </div>
            <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {isEdit ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("tasks.deleteProject")}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting || isPending}>
                  {(isSubmitting || isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEdit ? t("common.save") : t("tasks.createProject")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEdit && project && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("tasks.deleteProject")}</DialogTitle>
              <DialogDescription>
                {t("tasks.deleteProjectConfirm", { name: project.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
                {t("common.cancel")}
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("tasks.deleteProject")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function ProjectEditButton({
  project,
  onDeleted,
}: {
  project: { id: string; name: string; description: string | null };
  onDeleted?: (id: string) => void;
}) {
  const { t } = useLocale();
  return (
    <ProjectFormDialog
      project={project}
      onDeleted={onDeleted}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label={t("tasks.editProject")}
          onClick={(event) => event.stopPropagation()}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  );
}
