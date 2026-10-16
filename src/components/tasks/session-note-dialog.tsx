"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveTimeEntryNote } from "@/actions/task-time";
import { useLocale } from "@/components/layout/locale-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SessionNoteDialog({
  open,
  entryId,
  onOpenChange,
}: {
  open: boolean;
  entryId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setNote("");
  }, [open, entryId]);

  function close() {
    onOpenChange(false);
    router.refresh();
  }

  function save() {
    if (!entryId || !note.trim()) {
      close();
      return;
    }
    startTransition(async () => {
      const result = await saveTimeEntryNote(entryId, note);
      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("tasks.noteTitle")}</DialogTitle>
          <DialogDescription>{t("tasks.noteHint")}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("tasks.notePlaceholder")}
          rows={4}
          autoFocus
        />
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={close}>
            {t("tasks.noteSkip")}
          </Button>
          <Button type="button" disabled={isPending || !note.trim()} onClick={save}>
            {t("tasks.noteSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
