import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee } from "@/lib/api/auth";
import { recalculateAttendanceTotals } from "@/lib/api/services";
import { fail, ok, serverError } from "@/lib/api/response";

/** POST /api/v1/time/clock-out */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;

    const openEntry = await prisma.clockEntry.findFirst({
      where: { employeeId: user.employeeId, clockOut: null },
      include: { breaks: true },
    });
    if (!openEntry) return fail("You're not currently clocked in.", 409);

    const now = new Date();
    const openBreak = openEntry.breaks.find((b) => !b.endedAt);
    if (openBreak) {
      await prisma.break.update({ where: { id: openBreak.id }, data: { endedAt: now } });
    }

    const entry = await prisma.clockEntry.update({
      where: { id: openEntry.id },
      data: { clockOut: now },
    });

    if (openEntry.attendanceId) {
      await recalculateAttendanceTotals(openEntry.attendanceId);
    }

    return ok({ id: entry.id, clockOut: entry.clockOut }, { message: "Clocked out." });
  } catch (err) {
    return serverError(err);
  }
}
