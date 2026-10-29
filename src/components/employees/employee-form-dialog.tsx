"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/app-toast";
import { Loader2 } from "lucide-react";
import {
  employeeCreateSchema,
  employeeSchema,
  type EmployeeCreateInput,
  type EmployeeInput,
} from "@/lib/validations/employee";
import { createEmployee, updateEmployee } from "@/actions/employee";
import { useLocale } from "@/components/layout/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export interface EmployeeFormValues extends EmployeeInput {
  id?: string;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: EmployeeFormValues;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const isEditing = !!defaultValues?.id;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeCreateInput>({
    resolver: zodResolver(isEditing ? employeeSchema : employeeCreateSchema),
    defaultValues: {
      role: "EMPLOYEE",
      employmentType: "FULL_TIME",
      status: "ACTIVE",
      weeklyHours: 40,
      vacationAllowance: 20,
      hireDate: new Date(),
      password: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        role: "EMPLOYEE",
        employmentType: "FULL_TIME",
        status: "ACTIVE",
        weeklyHours: 40,
        vacationAllowance: 20,
        hireDate: new Date(),
        password: "",
        ...defaultValues,
      });
    }
  }, [open, defaultValues, reset]);

  async function onSubmit(data: EmployeeCreateInput) {
    const payload = { ...data, departmentId: null, managerId: null };
    const result = isEditing
      ? await updateEmployee({ ...payload, id: defaultValues!.id! })
      : await createEmployee(payload);

    if (result.success) {
      toast.success(result.message ?? "Saved");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit teammate" : "Add teammate"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update profile details."
              : "Creates a login account (email + password) and adds them to the team in one step."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-danger">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-danger">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" disabled={isEditing} {...register("email")} />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Login password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={t("ph.minPassword")}
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
              <p className="text-xs text-muted-foreground">
                Saved hashed in the database. Share it so they can sign in at login.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="position">Position</Label>
              <Input id="position" {...register("position")} />
              {errors.position && <p className="text-xs text-danger">{errors.position.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="ADMIN">Boss</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Employment type</Label>
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full-time</SelectItem>
                      <SelectItem value="PART_TIME">Part-time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ON_LEAVE">On leave</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="TERMINATED">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hireDate">Hire date</Label>
              <Input
                id="hireDate"
                type="date"
                {...register("hireDate", {
                  setValueAs: (v) => (v ? new Date(v) : undefined),
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="weeklyHours">Weekly hours</Label>
              <Input id="weeklyHours" type="number" step="0.5" {...register("weeklyHours")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vacationAllowance">Vacation days/yr</Label>
              <Input id="vacationAllowance" type="number" step="0.5" {...register("vacationAllowance")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create account & add to team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
