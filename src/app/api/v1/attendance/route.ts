import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee } from "@/lib/api/auth";
import { hasPermission } from "@/lib/rbac";
import { ok, serverError } from "@/lib/api/response";

/** GET /api/v1/attendance — own year attendance; ?scope=corrections for pending (boss) */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;

    const scope = req.nextUrl.searchParams.get("scope");
    if (scope === "corrections" && hasPermission(user.role, "ATTENDANCE_EDIT")) {
      const pending = await prisma.correctionRequest.findMany({
        where: { status: "PENDING" },
        include: {
          employee: { select: { firstName: true, lastName: true } },
          attendance: { select: { date: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      return ok(
        pending.map((c) => ({
          id: c.id,
          reason: c.reason,
          requestedClockIn: c.requestedClockIn,
          requestedClockOut: c.requestedClockOut,
          date: c.attendance.date,
          employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
        })),
      );
    }

    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31);
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: user.employeeId,
        date: { gte: yearStart, lte: yearEnd },
      },
      include: { clockEntries: { include: { breaks: true } } },
      orderBy: { date: "desc" },
    });

    return ok(attendances);
  } catch (err) {
    return serverError(err);
  }
}
