"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "@/lib/i18n/app-toast";
import { Loader2 } from "lucide-react";
import { clockOut, hasOpenShift } from "@/actions/time-tracking";
import { useLocale } from "@/components/layout/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function useSignOutChoice() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function request() {
    const clockedIn = await hasOpenShift();
    if (clockedIn) setOpen(true);
    else await signOut({ callbackUrl: "/login" });
  }

  async function clockOutAndLeave() {
    setPending(true);
    const result = await clockOut();
    if (!result.success && result.error !== "You're not currently clocked in.") {
      toast.error(result.error);
      setPending(false);
      return;
    }
    await signOut({ callbackUrl: "/login" });
  }

  async function leaveOnly() {
    setPending(true);
    await signOut({ callbackUrl: "/login" });
  }

  return { open, setOpen, pending, request, clockOutAndLeave, leaveOnly };
}

export function SignOutDialog({
  open,
  pending,
  onOpenChange,
  onClockOut,
  onLeaveOnly,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onClockOut: () => void;
  onLeaveOnly: () => void;
}) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("signOut.title")}</DialogTitle>
          <DialogDescription>{t("signOut.clockQuestion")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={onLeaveOnly}>
            {t("signOut.keepShift")}
          </Button>
          <Button type="button" disabled={pending} onClick={onClockOut}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("signOut.clockAndLeave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
