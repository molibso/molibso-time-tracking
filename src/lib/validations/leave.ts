import { z } from "zod";
import { LeaveType, LeaveStatus, CorrectionStatus } from "@prisma/client";

export const leaveRequestSchema = z
  .object({
    type: z.nativeEnum(LeaveType),
    dayPart: z.enum(["FULL", "MORNING", "AFTERNOON"]).default("FULL"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().max(500).optional(),
  })
  .refine((data) => data.dayPart !== "FULL" || data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const leaveReviewSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(LeaveStatus),
  reviewComment: z.string().max(500).optional(),
});
export type LeaveReviewInput = z.infer<typeof leaveReviewSchema>;

export const correctionRequestSchema = z.object({
  attendanceId: z.string(),
  requestedClockIn: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Use HH:MM format")
    .optional()
    .or(z.literal("")),
  requestedClockOut: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Use HH:MM format")
    .optional()
    .or(z.literal("")),
  reason: z.string().min(1, "Please explain the correction").max(500),
});
export type CorrectionRequestInput = z.infer<typeof correctionRequestSchema>;

export const correctionReviewSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(CorrectionStatus),
  reviewComment: z.string().max(500).optional(),
});
export type CorrectionReviewInput = z.infer<typeof correctionReviewSchema>;
