import type { PrismaClient } from "@prisma/client";
import { Role } from "@prisma/client";
import { effectiveRole } from "@/lib/rbac";

/** Flat hierarchy: bosses see everyone; employees only themselves. */
export async function getVisibleEmployeeIds(
  _prisma: PrismaClient,
  role: Role | undefined,
  employeeId: string | null,
): Promise<"all" | string[]> {
  if (effectiveRole(role) === Role.ADMIN) return "all";
  return employeeId ? [employeeId] : [];
}

export function employeeIdsWhere(scope: "all" | string[]) {
  if (scope === "all") return {};
  if (scope.length === 0) return { id: "__none__" };
  return { id: { in: scope } };
}

export function leaveEmployeeIdsWhere(scope: "all" | string[]) {
  if (scope === "all") return {};
  if (scope.length === 0) return { employeeId: "__none__" };
  return { employeeId: { in: scope } };
}
