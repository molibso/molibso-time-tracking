"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { holidaySchema, type HolidayInput } from "@/lib/validations/settings";
import { createHoliday, deleteHoliday } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export interface HolidayRow {
  id: string;
  name: string;
  date: string;
  isPaid: boolean;
}

export function HolidayManager({ holidays }: { holidays: HolidayRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HolidayInput>({ resolver: zodResolver(holidaySchema), defaultValues: { isPaid: true } });

  async function onSubmit(data: HolidayInput) {
    const result = await createHoliday(data);
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
      const result = await deleteHoliday(id);
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
          <Input placeholder="Holiday name" {...register("name")} />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
        </div>
        <Input type="date" className="flex-1 min-w-[140px]" {...register("date", { setValueAs: (v) => new Date(v) })} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </form>

      <div className="divide-y divide-border rounded-lg border border-border">
        {holidays.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">No holidays configured yet.</p>
        )}
        {holidays.map((h) => (
          <div key={h.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{h.name}</p>
              <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
            </div>
            <Button variant="ghost" size="icon" disabled={isPending} onClick={() => remove(h.id)}>
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
