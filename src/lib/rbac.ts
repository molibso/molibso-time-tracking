import { Role } from "@prisma/client";

/**
 * Flat hierarchy for a small team:
 * - EMPLOYEE — personal time, leave requests
 * - ADMIN (boss) — sees and approves everyone
 * MANAGER is kept in the schema for compatibility but treated as ADMIN.
 */
export function effectiveRole(role: Role | undefined): Role {
  if (role === Role.MANAGER || role === Role.ADMIN) return Role.ADMIN;
  return Role.EMPLOYEE;
}

export const PERMISSIONS = {
  EMPLOYEE_MANAGE: [Role.ADMIN],
  EMPLOYEE_VIEW_ALL: [Role.ADMIN],
  LEAVE_APPROVE: [Role.ADMIN],
  ATTENDANCE_EDIT: [Role.ADMIN],
  SETTINGS_MANAGE: [Role.ADMIN],
  ANALYTICS_VIEW: [Role.ADMIN],
  AUDIT_VIEW: [Role.ADMIN],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasPermission(role: Role | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(effectiveRole(role));
}

export function isAdmin(role?: Role): boolean {
  return effectiveRole(role) === Role.ADMIN;
}

export function isBoss(role?: Role): boolean {
  return isAdmin(role);
}

/** @deprecated Use isBoss — flat hierarchy has no mid-level managers. */
export function isManagerOrAbove(role?: Role): boolean {
  return isBoss(role);
}

export const ROUTE_ACCESS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/employees", roles: [Role.ADMIN] },
  { prefix: "/settings", roles: [Role.ADMIN] },
  { prefix: "/analytics", roles: [Role.ADMIN] },
];

export function canAccessRoute(pathname: string, role?: Role): boolean {
  const rule = ROUTE_ACCESS.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return true;
  if (!role) return false;
  return rule.roles.includes(effectiveRole(role));
}
