import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee } from "@/lib/api/auth";
import { getOrCreateTodayAttendance } from "@/lib/api/services";
import { fail, ok, serverError } from "@/lib/api/response";

/** POST /api/v1/time/clock-in */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;

    const openEntry = await prisma.clockEntry.findFirst({
      where: { employeeId: user.employeeId, clockOut: null },
    });
    if (openEntry) return fail("You're already clocked in.", 409);

    const attendance = await getOrCreateTodayAttendance(user.employeeId);
    const entry = await prisma.clockEntry.create({
      data: {
        employeeId: user.employeeId,
        clockIn: new Date(),
        source: "WEB",
        attendanceId: attendance.id,
      },
    });

    return ok({ id: entry.id, clockIn: entry.clockIn }, { message: "Clocked in." });
  } catch (err) {
    return serverError(err);
  }
}
