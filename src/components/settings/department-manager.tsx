"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { departmentSchema, type DepartmentInput } from "@/lib/validations/settings";
import { createDepartment, deleteDepartment } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  employeeCount: number;
}

export function DepartmentManager({ departments }: { departments: DepartmentRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentInput>({ resolver: zodResolver(departmentSchema) });

  async function onSubmit(data: DepartmentInput) {
    const result = await createDepartment(data);
    if (result.success) {
      toast.success(result.message);
      reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteDepartment(id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px] space-y-1">
          <Input placeholder="New department name" {...register("name")} />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
        </div>
        <Input placeholder="Description (optional)" className="flex-1 min-w-[160px]" {...register("description")} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </form>

      <div className="divide-y divide-border rounded-lg border border-border">
        {departments.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">No departments created yet.</p>
        )}
        {departments.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {d.description || "No description"} · {d.employeeCount} employee(s)
              </p>
            </div>
            <Button variant="ghost" size="icon" disabled={isPending} onClick={() => remove(d.id)}>
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
