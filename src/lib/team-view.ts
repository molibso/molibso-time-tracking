import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export type TeamMemberOption = {
  id: string;
  name: string;
  email: string;
  isSelf: boolean;
};

/**
 * Resolves which employee a page should show.
 * Employees always see themselves. Bosses can pick any teammate via ?employeeId=.
 */
export async function resolveTeamView(opts: {
  role: Role | undefined;
  selfEmployeeId: string;
  requestedId?: string | null;
}) {
  const canViewTeam = hasPermission(opts.role, "EMPLOYEE_VIEW_ALL");

  if (!canViewTeam) {
    return {
      canViewTeam: false,
      viewedEmployeeId: opts.selfEmployeeId,
      isSelf: true,
      members: [] as TeamMemberOption[],
      viewedName: "You",
    };
  }

  const employees = await prisma.employee.findMany({
    where: { status: { not: "TERMINATED" } },
    include: { user: { select: { email: true } } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const members: TeamMemberOption[] = employees.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    email: e.user.email,
    isSelf: e.id === opts.selfEmployeeId,
  }));

  const requested = opts.requestedId?.trim() || null;
  const viewedEmployeeId =
    requested && members.some((m) => m.id === requested) ? requested : opts.selfEmployeeId;

  const viewed = members.find((m) => m.id === viewedEmployeeId);
  const isSelf = viewedEmployeeId === opts.selfEmployeeId;

  return {
    canViewTeam: true,
    viewedEmployeeId,
    isSelf,
    members,
    viewedName: isSelf ? "You" : viewed?.name ?? "Teammate",
  };
}
