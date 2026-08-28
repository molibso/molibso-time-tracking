import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/response";
import { correctionReviewSchema } from "@/lib/validations/leave";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/v1/attendance/corrections/:id — approve/reject (boss). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { user, error } = await requireApiPermission(req, "ATTENDANCE_EDIT");
    if (error || !user) return error!;
    const { id } = await ctx.params;
    const body = await req.json();

    const parsed = correctionReviewSchema.safeParse({ id, ...body });
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const correction = await prisma.correctionRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        reviewComment: parsed.data.reviewComment,
        reviewedAt: new Date(),
        reviewedById: user.employeeId,
      },
    });

    if (correction.status === "APPROVED") {
      const entry = await prisma.clockEntry.findFirst({
        where: { attendanceId: correction.attendanceId },
      });
      if (entry) {
        await prisma.clockEntry.update({
          where: { id: entry.id },
          data: {
            clockIn: correction.requestedClockIn ?? entry.clockIn,
            clockOut: correction.requestedClockOut ?? entry.clockOut,
            isEdited: true,
          },
        });
      }
    }

    return ok(correction, { message: `Correction ${correction.status.toLowerCase()}.` });
  } catch (err) {
    return serverError(err);
  }
}
