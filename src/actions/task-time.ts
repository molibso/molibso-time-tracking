"use server";

import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { secondsBetween } from "@/lib/utils";
import type { ActionResult } from "./auth";

async function requireEmployee() {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("No employee profile linked to this account.");
  return { session, employeeId: session.user.employeeId };
}

async function stopOpenTimer(employeeId: string) {
  const open = await prisma.taskTimeEntry.findFirst({
    where: { employeeId, endedAt: null },
  });
  if (!open) return;

  const endedAt = new Date();
  await prisma.taskTimeEntry.update({
    where: { id: open.id },
    data: {
      endedAt,
      durationSeconds: secondsBetween(open.startedAt, endedAt),
    },
  });
}

async function assertCanTrackTask(taskId: string, employeeId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, status: true, title: true },
  });
  if (!task) throw new Error("Task not found.");
  if (task.assigneeId !== employeeId) {
    throw new Error("You can only track time on tasks assigned to you.");
  }
  if (task.status === TaskStatus.DONE) {
    throw new Error("This task is done — reopen it before tracking more time.");
  }
  return task;
}

export async function startTaskTimer(taskId: string): Promise<ActionResult> {
  try {
    const { employeeId } = await requireEmployee();
    const task = await assertCanTrackTask(taskId, employeeId);

    const existing = await prisma.taskTimeEntry.findFirst({
      where: { employeeId, taskId, endedAt: null },
    });
    if (existing) {
      return { success: false, error: "Timer is already running on this task." };
    }

    await stopOpenTimer(employeeId);

    await prisma.$transaction([
      prisma.taskTimeEntry.create({
        data: { taskId, employeeId },
      }),
      ...(task.status === TaskStatus.TODO
        ? [
            prisma.task.update({
              where: { id: taskId },
              data: { status: TaskStatus.IN_PROGRESS },
            }),
          ]
        : []),
    ]);

    revalidatePath("/tasks");
    return { success: true, message: `Timer started on "${task.title}".` };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to start timer" };
  }
}

export async function stopTaskTimer(taskId?: string): Promise<ActionResult> {
  try {
    const { employeeId } = await requireEmployee();

    const open = await prisma.taskTimeEntry.findFirst({
      where: {
        employeeId,
        endedAt: null,
        ...(taskId ? { taskId } : {}),
      },
      include: { task: { select: { title: true } } },
    });
    if (!open) return { success: false, error: "No active task timer." };

    const endedAt = new Date();
    const durationSeconds = secondsBetween(open.startedAt, endedAt);

    await prisma.taskTimeEntry.update({
      where: { id: open.id },
      data: { endedAt, durationSeconds },
    });

    revalidatePath("/tasks");
    return { success: true, message: `Stopped timer on "${open.task.title}".` };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to stop timer" };
  }
}
