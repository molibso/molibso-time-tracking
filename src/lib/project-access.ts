import type { Prisma } from "@prisma/client";

/**
 * Projects with no members stay visible to the team (older projects).
 * Once people are checked, only those people, the creator, and admins can see it.
 */
export function visibleProjectWhere(employeeId: string, isAdmin: boolean): Prisma.ProjectWhereInput {
  if (isAdmin) return {};
  return {
    OR: [
      { members: { none: {} } },
      { members: { some: { employeeId } } },
      { createdById: employeeId },
    ],
  };
}

export function visibleTaskWhere(employeeId: string, isAdmin: boolean): Prisma.TaskWhereInput {
  if (isAdmin) return {};
  return {
    OR: [
      { projectId: null },
      { project: { members: { none: {} } } },
      { project: { members: { some: { employeeId } } } },
      { project: { createdById: employeeId } },
      { assigneeId: employeeId },
      { assignments: { some: { employeeId } } },
      { createdById: employeeId },
    ],
  };
}
