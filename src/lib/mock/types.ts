import type {
  Attendance,
  AttendanceStatus,
  AuditLog,
  Break,
  ClockEntry,
  ClockSource,
  CompanySettings,
  CorrectionRequest,
  CorrectionStatus,
  Department,
  Employee,
  EmployeeStatus,
  EmploymentType,
  Holiday,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  Notification,
  NotificationType,
  PasswordResetToken,
  Role,
  Shift,
  User,
} from "@prisma/client";

export type Store = {
  users: User[];
  employees: Employee[];
  departments: Department[];
  clockEntries: ClockEntry[];
  breaks: Break[];
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
  correctionRequests: CorrectionRequest[];
  notifications: Notification[];
  companySettings: CompanySettings[];
  holidays: Holiday[];
  shifts: Shift[];
  passwordResetTokens: PasswordResetToken[];
  auditLogs: AuditLog[];
};

export type StoreEntity =
  | User
  | Employee
  | Department
  | ClockEntry
  | Break
  | Attendance
  | LeaveRequest
  | CorrectionRequest
  | Notification
  | CompanySettings
  | Holiday
  | Shift
  | PasswordResetToken
  | AuditLog;

export type WhereValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | { equals?: unknown; in?: unknown[]; gte?: Date; lte?: Date; not?: unknown }
  | Record<string, unknown>;

export type WhereInput = Record<string, unknown>;

export type IncludeSpec = Record<
  string,
  boolean | { include?: IncludeSpec; where?: WhereInput; take?: number; orderBy?: Record<string, "asc" | "desc"> }
>;

export {
  AttendanceStatus,
  ClockSource,
  CorrectionStatus,
  EmployeeStatus,
  EmploymentType,
  LeaveStatus,
  LeaveType,
  NotificationType,
  Role,
};
