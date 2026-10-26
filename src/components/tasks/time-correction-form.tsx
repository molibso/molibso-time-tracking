"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { correctTaskTime } from "@/actions/task-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/layout/locale-provider";

export function TimeCorrectionForm({
  entryId,
  durationSeconds,
}: {
  entryId: string;
  durationSeconds: number;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [hours, setHours] = useState(String(Math.floor(Math.max(0, durationSeconds) / 3600)));
  const [minutes, setMinutes] = useState(String(Math.floor((Math.max(0, durationSeconds) % 3600) / 60)));

  function save() {
    const totalMinutes = Number(hours) * 60 + Number(minutes);
    startTransition(async () => {
      const result = await correctTaskTime(entryId, totalMinutes);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-sm">
        <Input
          type="number"
          min={0}
          max={24}
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          className="h-9 w-16"
          aria-label={t("tasks.hoursShort")}
        />
        <span className="text-muted-foreground">{t("tasks.hoursShort")}</span>
      </label>
      <label className="flex items-center gap-1 text-sm">
        <Input
          type="number"
          min={0}
          max={59}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          className="h-9 w-16"
          aria-label={t("tasks.minutesShort")}
        />
        <span className="text-muted-foreground">{t("tasks.minutesShort")}</span>
      </label>
      <Button type="button" size="sm" variant="outline" onClick={save} disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("tasks.correct")}
      </Button>
    </div>
  );
}
