"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { companySettingsSchema, type CompanySettingsInput } from "@/lib/validations/settings";
import { updateCompanySettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function CompanySettingsForm({ defaultValues }: { defaultValues: CompanySettingsInput }) {
  const router = useRouter();
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
        <h3 className="text-sm font-semibold">Company profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" {...register("companyName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" placeholder="e.g. America/New_York" {...register("timezone")} />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="text-sm font-semibold">Working hours & overtime</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="workDayStartTime">Day starts</Label>
            <Input id="workDayStartTime" type="time" {...register("workDayStartTime")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workDayEndTime">Day ends</Label>
            <Input id="workDayEndTime" type="time" {...register("workDayEndTime")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="standardWeeklyHours">Standard weekly hours</Label>
            <Input id="standardWeeklyHours" type="number" step="0.5" {...register("standardWeeklyHours")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="overtimeThresholdDaily">Overtime after (hrs/day)</Label>
            <Input id="overtimeThresholdDaily" type="number" step="0.5" {...register("overtimeThresholdDaily")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="overtimeMultiplier">Overtime multiplier</Label>
            <Input id="overtimeMultiplier" type="number" step="0.1" {...register("overtimeMultiplier")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultVacationDays">Default vacation days/yr</Label>
            <Input id="defaultVacationDays" type="number" step="0.5" {...register("defaultVacationDays")} />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="text-sm font-semibold">Break rules</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="breakDurationMinutes">Standard break duration (min)</Label>
            <Input id="breakDurationMinutes" type="number" {...register("breakDurationMinutes")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxBreaksPerDay">Max breaks per day</Label>
            <Input id="maxBreaksPerDay" type="number" {...register("maxBreaksPerDay")} />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h3 className="text-sm font-semibold">Notifications</h3>
        {(
          [
            ["notifyClockInReminder", "Clock-in reminder"],
            ["notifyClockOutReminder", "Clock-out reminder"],
            ["notifyBreakReminder", "Break reminder"],
            ["notifyLeaveUpdates", "Leave approval updates"],
          ] as const
        ).map(([name, label]) => (
          <div key={name} className="flex items-center justify-between">
            <span className="text-sm">{label}</span>
            <Controller
              control={control}
              name={name}
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
        ))}
      </section>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </form>
  );
}
