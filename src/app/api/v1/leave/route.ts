import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee, requireApiPermission } from "@/lib/api/auth";
import { resolveLeaveLength } from "@/lib/leave-days";
import { created, fail, notFound, ok, serverError } from "@/lib/api/response";
import { leaveRequestSchema, leaveReviewSchema } from "@/lib/validations/leave";
import { hasPermission } from "@/lib/rbac";

/** GET /api/v1/leave — my leave; bosses can pass ?scope=pending|all */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;

    const scope = req.nextUrl.searchParams.get("scope");
    const canApprove = hasPermission(user.role, "LEAVE_APPROVE");

    if (scope === "pending" && canApprove) {
      const pending = await prisma.leaveRequest.findMany({
        where: { status: "PENDING" },
        include: { employee: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      });
      return ok(
        pending.map((l) => ({
          id: l.id,
          type: l.type,
          startDate: l.startDate,
          endDate: l.endDate,
          totalDays: l.totalDays,
          reason: l.reason,
          status: l.status,
          employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
        })),
      );
    }

    const mine = await prisma.leaveRequest.findMany({
      where: { employeeId: user.employeeId },
      orderBy: { createdAt: "desc" },
    });
    return ok(mine);
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/v1/leave — create leave request */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;

    const body = await req.json();
    const parsed = leaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400, parsed.error.flatten());
    }

    const { type, startDate, reason } = parsed.data;
    const length = resolveLeaveLength(type, parsed.data.dayPart, startDate, parsed.data.endDate);
    if (length.error) return fail(length.error);
    const { totalDays, endDate } = length;
    const dayPart = type === "VACATION" ? parsed.data.dayPart : "FULL";

    if (type === "VACATION") {
      const employee = await prisma.employee.findUnique({ where: { id: user.employeeId } });
      if (employee) {
        const used = await prisma.leaveRequest.aggregate({
          where: { employeeId: employee.id, type: "VACATION", status: "APPROVED" },
          _sum: { totalDays: true },
        });
        const remaining = employee.vacationAllowance - (used._sum.totalDays ?? 0);
        if (totalDays > remaining) {
          return fail(`Only ${remaining} vacation day(s) remaining.`);
        }
      }
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: user.employeeId,
        type,
        dayPart,
        startDate,
        endDate,
        totalDays,
        reason,
      },
    });

    return created(leave, "Leave request submitted.");
  } catch (err) {
    return serverError(err);
  }
}
