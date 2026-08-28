import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api/auth";
import { ok, serverError } from "@/lib/api/response";

/** GET /api/v1/notifications */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireApiUser(req);
    if (error || !user) return error!;

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return ok(notifications);
  } catch (err) {
    return serverError(err);
  }
}

/** PATCH /api/v1/notifications — mark all (or one) as read. body: { id?: string } */
export async function PATCH(req: NextRequest) {
  try {
    const { user, error } = await requireApiUser(req);
    if (error || !user) return error!;

    let id: string | undefined;
    try {
      const body = await req.json();
      id = typeof body?.id === "string" ? body.id : undefined;
    } catch {
      /* mark all */
    }

    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId: user.id },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    }

    return ok({ marked: true }, { message: "Notifications updated." });
  } catch (err) {
    return serverError(err);
  }
}
