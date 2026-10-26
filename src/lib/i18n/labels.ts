import type { MessageKey } from "@/lib/i18n/messages";

const LEAVE_KIND: Record<string, MessageKey> = {
  VACATION: "leave.kind.VACATION",
  SICK: "leave.kind.SICK",
  PERSONAL: "leave.kind.PERSONAL",
  HALF_DAY: "leave.kind.HALF_DAY",
  WORK_FROM_HOME: "leave.kind.WORK_FROM_HOME",
};

const LEAVE_STATUS: Record<string, MessageKey> = {
  PENDING: "leave.status.PENDING",
  APPROVED: "leave.status.APPROVED",
  REJECTED: "leave.status.REJECTED",
  CANCELLED: "leave.status.CANCELLED",
};

const TASK_STATUS: Record<string, MessageKey> = {
  TODO: "tasks.status.TODO",
  IN_PROGRESS: "tasks.status.IN_PROGRESS",
  IN_REVIEW: "tasks.status.IN_REVIEW",
  DONE: "tasks.status.DONE",
};

const TASK_PRIORITY: Record<string, MessageKey> = {
  LOW: "tasks.priority.LOW",
  MEDIUM: "tasks.priority.MEDIUM",
  HIGH: "tasks.priority.HIGH",
  URGENT: "tasks.priority.URGENT",
};

export function leaveKindKey(type: string): MessageKey | null {
  return LEAVE_KIND[type] ?? null;
}

export function leaveStatusKey(status: string): MessageKey | null {
  return LEAVE_STATUS[status] ?? null;
}

export function taskStatusKey(status: string): MessageKey | null {
  return TASK_STATUS[status] ?? null;
}

export function taskPriorityKey(priority: string): MessageKey | null {
  return TASK_PRIORITY[priority] ?? null;
}

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export const LEAVE_KINDS = ["VACATION", "SICK", "PERSONAL", "WORK_FROM_HOME"] as const;

export function leavePartKey(dayPart: string | null | undefined): MessageKey | null {
  if (dayPart === "MORNING") return "leave.part.morning";
  if (dayPart === "AFTERNOON") return "leave.part.afternoon";
  return null;
}
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
