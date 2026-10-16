import type { Store } from "./types";

/** Prisma @default values the mock layer must apply on create. */
export const MODEL_DEFAULTS: Partial<Record<keyof Store, Record<string, unknown>>> = {
  users: {
    role: "EMPLOYEE",
    isActive: true,
    emailVerified: null,
    image: null,
    lastLoginAt: null,
  },
  employees: {
    employmentType: "FULL_TIME",
    weeklyHours: 40,
    vacationAllowance: 20,
    status: "ACTIVE",
    phone: null,
    avatarUrl: null,
    departmentId: null,
    managerId: null,
  },
  clockEntries: {
    source: "WEB",
    clockOut: null,
    note: null,
    attendanceId: null,
    editedById: null,
    isEdited: false,
  },
  breaks: {
    endedAt: null,
    reason: null,
  },
  attendances: {
    status: "PRESENT",
    totalWorkedMinutes: 0,
    breakMinutes: 0,
    overtimeMinutes: 0,
    note: null,
  },
  leaveRequests: {
    status: "PENDING",
    reason: null,
    reviewedById: null,
    reviewComment: null,
    reviewedAt: null,
  },
  correctionRequests: {
    status: "PENDING",
    requestedClockIn: null,
    requestedClockOut: null,
    reviewedById: null,
    reviewComment: null,
    reviewedAt: null,
  },
  notifications: {
    isRead: false,
    link: null,
  },
  companySettings: {
    companyName: "My Company",
    logoUrl: null,
    timezone: "UTC",
    workDayStartTime: "09:00",
    workDayEndTime: "17:00",
    standardWeeklyHours: 40,
    breakDurationMinutes: 30,
    maxBreaksPerDay: 2,
    overtimeThresholdDaily: 8,
    overtimeMultiplier: 1.5,
    defaultVacationDays: 20,
    notifyClockInReminder: true,
    notifyClockOutReminder: true,
    notifyBreakReminder: true,
    notifyLeaveUpdates: true,
    notifyOvertimeAlert: true,
  },
  holidays: {
    isPaid: true,
  },
  departments: {
    description: null,
    managerId: null,
  },
  passwordResetTokens: {
    usedAt: null,
  },
  auditLogs: {
    userId: null,
    entityId: null,
    metadata: null,
    ipAddress: null,
  },
};
