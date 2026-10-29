"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/app-toast";
import { Loader2 } from "lucide-react";
import { companySettingsSchema, type CompanySettingsInput } from "@/lib/validations/settings";
import { updateCompanySettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/components/layout/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const NOTIFY_FIELDS = [
  ["notifyClockInReminder", "settings.notifyClockIn"],
  ["notifyClockOutReminder", "settings.notifyClockOut"],
  ["notifyBreakReminder", "settings.notifyBreak"],
  ["notifyLeaveUpdates", "settings.notifyLeave"],
  ["notifyOvertimeAlert", "settings.notifyOvertime"],
] as const satisfies ReadonlyArray<readonly [keyof CompanySettingsInput, MessageKey]>;

export function CompanySettingsForm({ defaultValues }: { defaultValues: CompanySettingsInput }) {
  const router = useRouter();
  const { t } = useLocale();
  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting, isDirty },
  } = useForm<CompanySettingsInput>({ resolver: zodResolver(companySettingsSchema), defaultValues });

  async function onSubmit(data: CompanySettingsInput) {
    const result = await updateCompanySettings(data);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">{t("settings.profile")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">{t("settings.companyName")}</Label>
            <Input id="companyName" {...register("companyName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">{t("settings.timezone")}</Label>
            <Input id="timezone" placeholder={t("ph.timezone")} {...register("timezone")} />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="text-sm font-semibold">{t("settings.hours")}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="workDayStartTime">{t("settings.dayStart")}</Label>
            <Input id="workDayStartTime" type="time" {...register("workDayStartTime")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workDayEndTime">{t("settings.dayEnd")}</Label>
            <Input id="workDayEndTime" type="time" {...register("workDayEndTime")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="standardWeeklyHours">{t("settings.weeklyHours")}</Label>
            <Input id="standardWeeklyHours" type="number" step="0.5" {...register("standardWeeklyHours")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultVacationDays">{t("settings.vacationDays")}</Label>
            <Input id="defaultVacationDays" type="number" step="0.5" {...register("defaultVacationDays")} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t("settings.overtimeRule")}</p>
        <input type="hidden" {...register("overtimeThresholdDaily")} />
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="text-sm font-semibold">{t("settings.breaks")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="breakDurationMinutes">{t("settings.breakMinutes")}</Label>
            <Input id="breakDurationMinutes" type="number" {...register("breakDurationMinutes")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxBreaksPerDay">{t("settings.maxBreaks")}</Label>
            <Input id="maxBreaksPerDay" type="number" {...register("maxBreaksPerDay")} />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h3 className="text-sm font-semibold">{t("settings.notifications")}</h3>
        {NOTIFY_FIELDS.map(([name, label]) => (
          <div key={name} className="flex items-center justify-between gap-4">
            <span className="text-sm">{t(label)}</span>
            <Controller
              control={control}
              name={name}
              render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />}
            />
          </div>
        ))}
      </section>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("settings.save")}
      </Button>
    </form>
  );
}
