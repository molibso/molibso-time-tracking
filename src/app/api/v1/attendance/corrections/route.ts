import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee } from "@/lib/api/auth";
import { created, fail, serverError } from "@/lib/api/response";
import { correctionRequestSchema } from "@/lib/validations/leave";

/** POST /api/v1/attendance/corrections — request a time correction */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;

    const body = await req.json();
    const parsed = correctionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: parsed.data.attendanceId },
    });
    if (!attendance || attendance.employeeId !== user.employeeId) {
      return fail("Attendance record not found.", 404);
    }

    function toDateTime(time?: string) {
      if (!time) return undefined;
      const [h, m] = time.split(":").map(Number);
      const d = new Date(attendance!.date);
      d.setHours(h, m, 0, 0);
      return d;
    }

    const correction = await prisma.correctionRequest.create({
      data: {
        employeeId: user.employeeId,
        attendanceId: parsed.data.attendanceId,
        requestedClockIn: toDateTime(parsed.data.requestedClockIn || undefined),
        requestedClockOut: toDateTime(parsed.data.requestedClockOut || undefined),
        reason: parsed.data.reason,
      },
    });

    return created(correction, "Correction request submitted.");
  } catch (err) {
    return serverError(err);
  }
}
