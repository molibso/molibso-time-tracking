"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Square } from "lucide-react";
import { startTaskTimer, stopTaskTimer } from "@/actions/task-time";
import { SessionNoteDialog } from "@/components/tasks/session-note-dialog";
import { Button } from "@/components/ui/button";
import { formatClock, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";

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
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteEntryId, setNoteEntryId] = useState<string | null>(null);
  const [holdingNote, setHoldingNote] = useState(false);
  const running = isActive && !holdingNote;

  function openNote(entryId: string) {
    setHoldingNote(true);
    setNoteEntryId(entryId);
    setNoteOpen(true);
  }

  useEffect(() => {
    if (!isActive) {
      setElapsed(0);
      setHoldingNote(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (!running || !startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, startedAt]);

  const totalSeconds = loggedSeconds + (running || holdingNote ? elapsed : 0);

  function start() {
    startTransition(async () => {
      const result = await startTaskTimer(taskId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.stoppedEntryId) openNote(result.stoppedEntryId);
      else {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  function stop() {
    startTransition(async () => {
      const result = await stopTaskTimer(taskId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.entryId) openNote(result.entryId);
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
      <SessionNoteDialog open={noteOpen} entryId={noteEntryId} onOpenChange={setNoteOpen} />
      <span
        className={cn(
          "min-w-[4.5rem] font-mono text-xs tabular-nums",
          running ? "font-semibold text-petrol" : "text-muted-foreground",
        )}
      >
        {totalSeconds > 0 ? (running ? formatClock(totalSeconds) : formatDuration(totalSeconds)) : "00:00:00"}
      </span>
      {running ? (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-8 w-8 shrink-0"
          disabled={isPending}
          onClick={stop}
          title={t("tip.stopTimer")}
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0"
          disabled={isPending || noteOpen}
          onClick={start}
          title={t("tip.startTimer")}
        >
          <Play className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
