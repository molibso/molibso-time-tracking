import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/response";

/** POST /api/v1/time/break/end */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;

    const openEntry = await prisma.clockEntry.findFirst({
      where: { employeeId: user.employeeId, clockOut: null },
      include: { breaks: true },
    });
    if (!openEntry) return fail("No active shift found.", 409);

    const openBreak = openEntry.breaks.find((b) => !b.endedAt);
    if (!openBreak) return fail("You don't have an active break.", 409);

    const brk = await prisma.break.update({
      where: { id: openBreak.id },
      data: { endedAt: new Date() },
    });

    return ok({ id: brk.id, endedAt: brk.endedAt }, { message: "Break ended." });
  } catch (err) {
    return serverError(err);
  }
}
