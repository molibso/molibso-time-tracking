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
import { Label } from "@/components/ui/label";
import { formatDateRange } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";

export interface HolidayRow {
  id: string;
  name: string;
  date: string;
  endDate: string | null;
  isPaid: boolean;
}

export function HolidayManager({ holidays }: { holidays: HolidayRow[] }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HolidayInput>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { isPaid: true, endDate: null },
  });

  async function onSubmit(data: HolidayInput) {
    const result = await createHoliday(data);
    if (result.success) {
      toast.success(result.message);
      reset({ name: "", isPaid: true, date: undefined, endDate: null });
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1 space-y-1">
            <Label htmlFor="holiday-name">{t("settings.holidayName")}</Label>
            <Input id="holiday-name" placeholder={t("ph.holidayName")} {...register("name")} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <Label htmlFor="holiday-start">{t("leave.startDate")}</Label>
            <Input
              id="holiday-start"
              type="date"
              {...register("date", { setValueAs: (value) => (value ? new Date(value) : undefined) })}
            />
            {errors.date && <p className="text-xs text-danger">{errors.date.message}</p>}
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <Label htmlFor="holiday-end">{t("leave.endDate")}</Label>
            <Input
              id="holiday-end"
              type="date"
              {...register("endDate", {
                setValueAs: (value) => (value ? new Date(value) : null),
              })}
            />
            {errors.endDate && <p className="text-xs text-danger">{String(errors.endDate.message)}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("common.add")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("settings.holidayRangeHint")}</p>
      </form>

      <div className="divide-y divide-border rounded-lg border border-border">
        {holidays.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">{t("settings.holidaysEmpty")}</p>
        )}
        {holidays.map((h) => (
          <div key={h.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{h.name}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatDateRange(h.date, h.endDate ?? h.date, locale)}
              </p>
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
