"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { employeeProfileSchema, type EmployeeProfileInput } from "@/lib/validations/employee";
import { updateOwnProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/layout/locale-provider";

export function ProfileForm({ defaultValues }: { defaultValues: EmployeeProfileInput }) {
  const router = useRouter();
  const { t } = useLocale();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EmployeeProfileInput>({ resolver: zodResolver(employeeProfileSchema), defaultValues });

  async function onSubmit(data: EmployeeProfileInput) {
    const result = await updateOwnProfile(data);
    if (result.success) {
      toast.success(result.message ?? "Profile updated");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" placeholder={t("ph.phone")} {...register("phone")} />
        {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="avatarUrl">Avatar URL</Label>
        <Input id="avatarUrl" placeholder="https://…" {...register("avatarUrl")} />
        {errors.avatarUrl && <p className="text-xs text-danger">{errors.avatarUrl.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}
