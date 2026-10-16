import { z } from "zod";

export const companySettingsSchema = z.object({
  companyName: z.string().min(1).max(120),
  timezone: z.string().min(1),
  workDayStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  workDayEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  standardWeeklyHours: z.coerce.number().min(1).max(80),
  breakDurationMinutes: z.coerce.number().min(0).max(240),
  maxBreaksPerDay: z.coerce.number().min(0).max(10),
  overtimeThresholdDaily: z.coerce.number().min(0).max(24),
  defaultVacationDays: z.coerce.number().min(0).max(60),
  notifyClockInReminder: z.boolean(),
  notifyClockOutReminder: z.boolean(),
  notifyBreakReminder: z.boolean(),
  notifyLeaveUpdates: z.boolean(),
  notifyOvertimeAlert: z.boolean(),
});
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(80),
  description: z.string().max(300).optional(),
  managerId: z.string().optional().nullable(),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const holidaySchema = z
  .object({
    name: z.string().min(1).max(100),
    date: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    isPaid: z.boolean().default(true),
  })
  .refine((data) => !data.endDate || data.endDate >= data.date, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });
export type HolidayInput = z.infer<typeof holidaySchema>;
