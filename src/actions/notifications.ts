"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "./auth";

export async function listMyNotifications() {
  const session = await auth();
  if (!session) return [];
  const rows = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Not authenticated" };

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Not authenticated" };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/dashboard");
  return { success: true };
}
