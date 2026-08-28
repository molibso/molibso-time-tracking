"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Square } from "lucide-react";
import { startTaskTimer, stopTaskTimer } from "@/actions/task-time";
import { Button } from "@/components/ui/button";
import { formatClock, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function TaskTimerButton({
  taskId,
  isActive,
  startedAt,
  loggedSeconds,
  canTrack,
}: {
  taskId: string;
  isActive: boolean;
  startedAt: string | null;
  loggedSeconds: number;
  canTrack: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive || !startedAt) {
      setElapsed(0);
      return;
    }
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isActive, startedAt]);

  const totalSeconds = loggedSeconds + (isActive ? elapsed : 0);

  function run(action: () => Promise<{ success: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!canTrack) {
    return (
      <span className="text-sm tabular-nums text-muted-foreground">
        {totalSeconds > 0 ? formatDuration(totalSeconds) : "—"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "min-w-[4.5rem] font-mono text-xs tabular-nums",
          isActive ? "font-semibold text-petrol" : "text-muted-foreground",
        )}
      >
        {totalSeconds > 0 ? (isActive ? formatClock(totalSeconds) : formatDuration(totalSeconds)) : "00:00:00"}
      </span>
      {isActive ? (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-8 w-8 shrink-0"
          disabled={isPending}
          onClick={() => run(() => stopTaskTimer(taskId))}
          title="Stop timer"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0"
          disabled={isPending}
          onClick={() => run(() => startTaskTimer(taskId))}
          title="Start timer"
        >
          <Play className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
