"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Square, Coffee, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clockIn, clockOut, startBreak, endBreak } from "@/actions/time-tracking";
import type { ClockStatus } from "@/types/clock";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<ClockStatus, { label: string; dot: string; text: string }> = {
  WORKING: { label: "Working", dot: "bg-success", text: "text-success" },
  ON_BREAK: { label: "On break", dot: "bg-warning", text: "text-warning" },
  OFFLINE: { label: "Offline", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

export function ClockWidget({
  initialStatus,
  clockInTime,
  breakSince,
  readOnly = false,
  personLabel,
}: {
  initialStatus: ClockStatus;
  clockInTime: string | null;
  breakSince: string | null;
  /** When true, show status only (boss viewing a teammate). */
  readOnly?: boolean;
  personLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState("00:00:00");

  const config = STATUS_CONFIG[initialStatus];

  useEffect(() => {
    const reference = initialStatus === "ON_BREAK" ? breakSince : clockInTime;
    if (!reference) {
      setElapsed("00:00:00");
      return;
    }
    const start = new Date(reference).getTime();
    const tick = () => {
      const diff = Math.max(0, Date.now() - start);
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockInTime, breakSince, initialStatus]);

  function runAction(action: () => Promise<{ success: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message ?? "Done");
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full status-dot animate-pulse-dot", config.dot)} />
            <span className={cn("text-sm font-semibold", config.text)}>{config.label}</span>
            {personLabel && (
              <span className="text-xs font-medium text-muted-foreground">· {personLabel}</span>
            )}
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums text-petrol sm:text-4xl">{elapsed}</p>
          {clockInTime && (
            <p className="text-xs text-muted-foreground">
              Since{" "}
              {new Date(clockInTime).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
          {readOnly && (
            <p className="mt-2 text-xs text-muted-foreground">
              View only — clock actions stay with the teammate.
            </p>
          )}
        </div>

        {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {initialStatus === "OFFLINE" && (
            <Button onClick={() => runAction(clockIn)} disabled={isPending} variant="success">
              <Play className="h-4 w-4" /> Clock In
            </Button>
          )}
          {initialStatus === "WORKING" && (
            <>
              <Button onClick={() => runAction(() => startBreak())} disabled={isPending} variant="outline">
                <Coffee className="h-4 w-4" /> Start Break
              </Button>
              <Button onClick={() => runAction(clockOut)} disabled={isPending} variant="destructive">
                <Square className="h-4 w-4" /> Clock Out
              </Button>
            </>
          )}
          {initialStatus === "ON_BREAK" && (
            <Button onClick={() => runAction(endBreak)} disabled={isPending} variant="default">
              <CircleCheck className="h-4 w-4" /> End Break
            </Button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
