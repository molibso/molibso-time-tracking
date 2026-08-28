import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee } from "@/lib/api/auth";
import { getOrCreateTodayAttendance, recalculateAttendanceTotals } from "@/lib/api/services";
import { fail, ok, serverError } from "@/lib/api/response";
import { getClockStatus } from "@/lib/queries/dashboard";

/** GET /api/v1/time/status */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;
    const status = await getClockStatus(user.employeeId);
    return ok({
      status: status.status,
      clockIn: status.openEntry?.clockIn ?? null,
      entryId: status.openEntry?.id ?? null,
      onBreakSince: status.onBreakSince,
    });
  } catch (err) {
    return serverError(err);
  }
}
