import { Role } from "@prisma/client";
import type { PermissionKey } from "./rbac";
import { effectiveRole, hasPermission } from "./rbac";

export type RoleView = {
  label: string;
  badgeVariant: "default" | "warning";
  dashboardTitle: string;
  dashboardSubtitle: string;
  capabilities: string[];
  pageCopy: {
    leave: string;
    attendance: string;
    tasks: string;
    employees: string;
    analytics: string;
  };
};

const EMPLOYEE_VIEW: RoleView = {
  label: "Employee",
  badgeVariant: "default",
  dashboardTitle: "Your workspace",
  dashboardSubtitle: "Clock in, track hours, and request leave.",
  capabilities: ["cap.clock", "cap.history", "cap.leave", "cap.calendar", "cap.tasks"],
  pageCopy: {
    leave: "Request time off and track your balance. Bosses review requests.",
    attendance: "Your presence and absences at a glance.",
    tasks: "Your assigned tasks, due dates, and estimated hours.",
    employees: "",
    analytics: "",
  },
};

const BOSS_VIEW: RoleView = {
  label: "Boss",
  badgeVariant: "warning",
  dashboardTitle: "Team overview",
  dashboardSubtitle: "See everyone, approve leave and corrections, and keep the team on track.",
  capabilities: [
    "cap.bossAll",
    "cap.bossHours",
    "cap.bossApprove",
    "cap.bossPeople",
    "cap.bossAnalytics",
    "cap.bossTasks",
  ],
  pageCopy: {
    leave: "Your own leave requests, plus approvals for the whole team.",
    attendance: "Your calendar, plus pending correction requests from everyone.",
    tasks: "Assign and track tasks across projects for the whole team.",
    employees: "Everyone on the molibso team — flat structure, no departments.",
    analytics: "Attendance, overtime, and utilization across the whole team.",
  },
};

export const ROLE_VIEWS: Record<Role, RoleView> = {
  [Role.EMPLOYEE]: EMPLOYEE_VIEW,
  [Role.MANAGER]: BOSS_VIEW,
  [Role.ADMIN]: BOSS_VIEW,
};

export function getRoleView(role: Role | undefined): RoleView {
  return ROLE_VIEWS[effectiveRole(role ?? Role.EMPLOYEE)];
}

export function can(role: Role | undefined, permission: PermissionKey): boolean {
  return hasPermission(role, permission);
}

/** Flat hierarchy: bosses see everyone; employees see only themselves. */
export function employeeScopeFilter(role: Role | undefined, employeeId: string | null) {
  if (effectiveRole(role) === Role.ADMIN) return {};
  return { id: employeeId ?? "__none__" };
}
