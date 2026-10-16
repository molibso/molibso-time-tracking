"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Square, Coffee, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clockIn, clockOut, startBreak, endBreak } from "@/actions/time-tracking";
import type { ClockStatus } from "@/types/clock";
import { cn } from "@/lib/utils";
import { useClockSession, type ClockSessionState } from "./clock-session";
import { useLocale } from "@/components/layout/locale-provider";
import { intlLocale, type MessageKey } from "@/lib/i18n/messages";

const STATUS_CONFIG: Record<ClockStatus, { labelKey: MessageKey; dot: string; text: string }> = {
  WORKING: { labelKey: "clock.working", dot: "bg-success", text: "text-success" },
  ON_BREAK: { labelKey: "clock.onBreak", dot: "bg-warning", text: "text-warning" },
  OFFLINE: { labelKey: "clock.offline", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

function formatElapsed(startIso: string) {
  const diff = Math.max(0, Date.now() - new Date(startIso).getTime());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ClockWidget({
  readOnly = false,
  personLabel,
}: {
  /** When true, show status only (boss viewing a teammate). */
  readOnly?: boolean;
  personLabel?: string;
}) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { session, commit, restore } = useClockSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const revision = useRef(0);
  const queue = useRef(Promise.resolve());
  const [elapsed, setElapsed] = useState("00:00:00");

  const { status, clockInTime, breakSince } = session;
  const config = STATUS_CONFIG[status];

  useEffect(() => {
    const reference = status === "ON_BREAK" ? breakSince : clockInTime;
    if (!reference || status === "OFFLINE") {
      setElapsed("00:00:00");
      return;
    }
    const tick = () => setElapsed(formatElapsed(reference));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockInTime, breakSince, status]);

  function run(next: ClockSessionState, action: () => Promise<{ success: boolean; message?: string; error?: string }>) {
    const rev = ++revision.current;
    const snapshot = sessionRef.current;
    sessionRef.current = next;
    commit(next);
    queue.current = queue.current.catch(() => undefined).then(async () => {
      const result = await action();
      if (!result.success) {
        if (revision.current === rev) {
          sessionRef.current = snapshot;
          restore(snapshot);
        }
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(result.message ?? "Done");
      if (revision.current === rev) router.refresh();
    });
  }

  function onClockIn() {
    run(
      { status: "WORKING", clockInTime: new Date().toISOString(), breakSince: null, completedBreakSecondsOnOpen: 0 },
      clockIn,
    );
  }

  function onClockOut() {
    run(
      { status: "OFFLINE", clockInTime: null, breakSince: null, completedBreakSecondsOnOpen: 0 },
      clockOut,
    );
  }

  function onStartBreak() {
    run({ ...sessionRef.current, status: "ON_BREAK", breakSince: new Date().toISOString() }, () => startBreak());
  }

  function onEndBreak() {
    const current = sessionRef.current;
    const extra = current.breakSince
      ? Math.max(0, Math.floor((Date.now() - new Date(current.breakSince).getTime()) / 1000))
      : 0;
    run(
      {
        ...current,
        status: "WORKING",
        breakSince: null,
        completedBreakSecondsOnOpen: current.completedBreakSecondsOnOpen + extra,
      },
      endBreak,
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full status-dot", status !== "OFFLINE" && "animate-pulse-dot", config.dot)} />
            <span className={cn("text-sm font-semibold", config.text)}>{t(config.labelKey)}</span>
            {personLabel && <span className="text-xs font-medium text-muted-foreground">· {personLabel}</span>}
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums text-petrol sm:text-4xl">{elapsed}</p>
          {clockInTime && status !== "OFFLINE" && (
            <p className="text-xs text-muted-foreground">
              {t("clock.since", {
                time: new Date(clockInTime).toLocaleTimeString(intlLocale(locale), {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }),
              })}
            </p>
          )}
          {readOnly && (
            <p className="mt-2 text-xs text-muted-foreground">{t("clock.readOnly")}</p>
          )}
        </div>

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            {status === "OFFLINE" && (
              <Button onClick={onClockIn} variant="success">
                <Play className="h-4 w-4" /> {t("clock.in")}
              </Button>
            )}
            {status === "WORKING" && (
              <>
                <Button onClick={onStartBreak} variant="outline">
                  <Coffee className="h-4 w-4" /> {t("clock.startBreak")}
                </Button>
                <Button onClick={onClockOut} variant="destructive">
                  <Square className="h-4 w-4" /> {t("clock.out")}
                </Button>
              </>
            )}
            {status === "ON_BREAK" && (
              <>
                <Button onClick={onEndBreak} variant="default">
                  <CircleCheck className="h-4 w-4" /> {t("clock.endBreak")}
                </Button>
                <Button onClick={onClockOut} variant="destructive">
                  <Square className="h-4 w-4" /> {t("clock.out")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
