"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { correctionRequestSchema, type CorrectionRequestInput } from "@/lib/validations/leave";
import { requestCorrection } from "@/actions/time-tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/layout/locale-provider";

export function CorrectionRequestDialog({ attendanceId, date }: { attendanceId: string; date: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CorrectionRequestInput>({
    resolver: zodResolver(correctionRequestSchema),
    defaultValues: { attendanceId },
  });

  async function onSubmit(data: CorrectionRequestInput) {
    const result = await requestCorrection(data);
    if (result.success) {
      toast.success(result.message);
      setOpen(false);
      reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" /> Request correction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a correction</DialogTitle>
          <DialogDescription>For {date}. Your manager will review this before it's applied.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("attendanceId")} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="requestedClockIn">Correct clock-in</Label>
              <Input id="requestedClockIn" type="time" {...register("requestedClockIn")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requestedClockOut">Correct clock-out</Label>
              <Input id="requestedClockOut" type="time" {...register("requestedClockOut")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" placeholder={t("ph.forgotClockOut")} {...register("reason")} />
            {errors.reason && <p className="text-xs text-danger">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
