"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { leaveRequestSchema, type LeaveRequestInput } from "@/lib/validations/leave";
import { createLeaveRequest } from "@/actions/leave";
import { useLocale } from "@/components/layout/locale-provider";
import { LEAVE_KINDS, leaveKindKey } from "@/lib/i18n/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LeaveRequestDialog() {
  const router = useRouter();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveRequestInput>({ resolver: zodResolver(leaveRequestSchema) });

  async function onSubmit(data: LeaveRequestInput) {
    const result = await createLeaveRequest(data);
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
        <Button>
          <Plus className="h-4 w-4" /> {t("leave.request")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("leave.requestTitle")}</DialogTitle>
          <DialogDescription>{t("leave.requestDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("leave.col.type")}</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ph.selectLeaveType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_KINDS.map((kind) => {
                      const key = leaveKindKey(kind);
                      return (
                        <SelectItem key={kind} value={kind}>
                          {key ? t(key) : kind}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-xs text-danger">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">{t("leave.startDate")}</Label>
              <Input id="startDate" type="date" {...register("startDate", { setValueAs: (v) => new Date(v) })} />
              {errors.startDate && <p className="text-xs text-danger">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">{t("leave.endDate")}</Label>
              <Input id="endDate" type="date" {...register("endDate", { setValueAs: (v) => new Date(v) })} />
              {errors.endDate && <p className="text-xs text-danger">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">{t("leave.reason")}</Label>
            <Textarea id="reason" placeholder={t("ph.leaveReason")} {...register("reason")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("leave.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
