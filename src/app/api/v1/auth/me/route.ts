import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { ok, serverError } from "@/lib/api/response";

/** GET /api/v1/auth/me — current authenticated user. */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireApiUser(req);
    if (error || !user) return error!;

    const employee = user.employeeId
      ? await prisma.employee.findUnique({
          where: { id: user.employeeId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            phone: true,
            weeklyHours: true,
            vacationAllowance: true,
            status: true,
            employeeCode: true,
          },
        })
      : null;

    return ok({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      employee,
    });
  } catch (err) {
    return serverError(err);
  }
}
