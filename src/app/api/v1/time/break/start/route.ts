import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/response";

/** POST /api/v1/time/break/start  body: { reason?: string } */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireApiEmployee(req);
    if (error || !user) return error!;

    let reason: string | undefined;
    try {
      const body = await req.json();
      reason = typeof body?.reason === "string" ? body.reason : undefined;
    } catch {
      /* empty body ok */
    }

    const openEntry = await prisma.clockEntry.findFirst({
      where: { employeeId: user.employeeId, clockOut: null },
      include: { breaks: true },
    });
    if (!openEntry) return fail("Clock in before starting a break.", 409);
    if (openEntry.breaks.some((b) => !b.endedAt)) return fail("You're already on a break.", 409);

    const brk = await prisma.break.create({
      data: { clockEntryId: openEntry.id, startedAt: new Date(), reason },
    });

    return ok({ id: brk.id, startedAt: brk.startedAt }, { message: "Break started." });
  } catch (err) {
    return serverError(err);
  }
}
