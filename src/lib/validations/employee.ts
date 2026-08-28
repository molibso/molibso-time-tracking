import { z } from "zod";
import { EmploymentType, EmployeeStatus, Role } from "@prisma/client";

const employeeBaseSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^[+()\-\s\d]{7,20}$/.test(v), "Enter a valid phone number"),
  position: z.string().min(1, "Position is required").max(100),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  role: z.nativeEnum(Role).default(Role.EMPLOYEE),
  employmentType: z.nativeEnum(EmploymentType).default(EmploymentType.FULL_TIME),
  hireDate: z.coerce.date(),
  weeklyHours: z.coerce.number().min(1).max(80).default(40),
  vacationAllowance: z.coerce.number().min(0).max(60).default(20),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE),
});

/** Create teammate: login account (User + password) + team profile (Employee). */
export const employeeCreateSchema = employeeBaseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

/** Shared / edit form fields (password not required when editing). */
export const employeeSchema = employeeBaseSchema.extend({
  password: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(8, "Password must be at least 8 characters").optional(),
  ),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

export const employeeUpdateSchema = employeeBaseSchema.partial().extend({
  id: z.string(),
});
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

export const employeeProfileSchema = z.object({
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^[+()\-\s\d]{7,20}$/.test(v), "Enter a valid phone number"),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});
export type EmployeeProfileInput = z.infer<typeof employeeProfileSchema>;
