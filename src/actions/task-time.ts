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
  if (!open) return null;

  const endedAt = new Date();
  await prisma.taskTimeEntry.update({
    where: { id: open.id },
    data: {
      endedAt,
      durationSeconds: secondsBetween(open.startedAt, endedAt),
    },
  });
  return open.id;
}

function refreshTracked() {
  revalidatePath("/tasks");
  revalidatePath("/meetings");
}

async function assertCanTrackTask(taskId: string, employeeId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      assigneeId: true,
      status: true,
      title: true,
      assignments: { select: { employeeId: true } },
    },
  });
  if (!task) throw new Error("Task not found.");
  const assigned =
    task.assigneeId === employeeId || task.assignments.some((assignment) => assignment.employeeId === employeeId);
  if (!assigned) {
    throw new Error("You can only track time on tasks assigned to you.");
  }
  if (task.status === TaskStatus.DONE) {
    throw new Error("This task is done — reopen it before tracking more time.");
  }
  return task;
}

export async function startTaskTimer(taskId: string): Promise<ActionResult & { stoppedEntryId?: string }> {
  try {
    const { employeeId } = await requireEmployee();
    const task = await assertCanTrackTask(taskId, employeeId);

    const existing = await prisma.taskTimeEntry.findFirst({
      where: { employeeId, taskId, endedAt: null },
    });
    if (existing) {
      return { success: false, error: "Timer is already running on this task." };
    }

    const stoppedEntryId = await stopOpenTimer(employeeId);

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

    refreshTracked();
    return {
      success: true,
      message: `Timer started on "${task.title}".`,
      ...(stoppedEntryId ? { stoppedEntryId } : {}),
    };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to start timer" };
  }
}

export async function stopTaskTimer(taskId?: string): Promise<ActionResult & { entryId?: string }> {
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

    refreshTracked();
    return { success: true, message: `Stopped timer on "${open.task.title}".`, entryId: open.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to stop timer" };
  }
}

export async function saveTimeEntryNote(entryId: string, note: string): Promise<ActionResult> {
  try {
    const { employeeId } = await requireEmployee();
    const text = note.trim();
    if (!text) return { success: false, error: "Write a short note, or skip." };
    if (text.length > 2000) return { success: false, error: "Keep the note under 2000 characters." };

    const entry = await prisma.taskTimeEntry.findUnique({
      where: { id: entryId },
      select: { employeeId: true, endedAt: true },
    });
    if (!entry || entry.employeeId !== employeeId) {
      return { success: false, error: "That session could not be found." };
    }
    if (!entry.endedAt) return { success: false, error: "Stop the timer before adding a note." };

    await prisma.taskTimeEntry.update({
      where: { id: entryId },
      data: { note: text },
    });

    refreshTracked();
    return { success: true, message: "Note saved." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to save note" };
  }
}

/** Applies a new duration immediately. The person who logged the time can correct their own session. */
export async function correctTaskTime(entryId: string, durationMinutes: number): Promise<ActionResult> {
  try {
    const { employeeId } = await requireEmployee();
    const minutes = Math.round(durationMinutes);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 24 * 60) {
      return { success: false, error: "Enter a duration between 0 minutes and 24 hours." };
    }

    const entry = await prisma.taskTimeEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.employeeId !== employeeId) {
      return { success: false, error: "That session could not be found." };
    }
    if (!entry.endedAt) return { success: false, error: "Stop the timer before correcting it." };

    const durationSeconds = minutes * 60;
    await prisma.taskTimeEntry.update({
      where: { id: entryId },
      data: {
        durationSeconds,
        endedAt: new Date(entry.startedAt.getTime() + durationSeconds * 1000),
      },
    });

    refreshTracked();
    return { success: true, message: "Time updated." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update time" };
  }
}
