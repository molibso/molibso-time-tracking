"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import type { ActionResult } from "./auth";

function combineDateAndTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const value = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  );
  if (Number.isNaN(value.getTime())) return null;
  return value;
}

export async function createMeetingRoom(input: {
  name: string;
  location?: string;
  capacity?: number | null;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "No employee profile linked to this account." };

    const name = input.name.trim();
    if (!name) return { success: false, error: "Enter a room name." };
    const capacity = input.capacity == null || Number.isNaN(input.capacity) ? null : Math.round(input.capacity);
    if (capacity != null && (capacity < 1 || capacity > 500)) {
      return { success: false, error: "Capacity should be between 1 and 500." };
    }

    await prisma.meetingRoom.create({
      data: {
        name: name.slice(0, 80),
        location: input.location?.trim() || null,
        capacity,
      },
    });

    revalidatePath("/rooms");
    return { success: true, message: `Room "${name}" added.` };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to add room" };
  }
}

export async function reserveRoom(input: {
  roomId: string;
  title: string;
  date: string;
  start: string;
  end: string;
  projectId?: string | null;
  note?: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    const employeeId = session?.user.employeeId;
    if (!employeeId) return { success: false, error: "No employee profile linked to this account." };

    const title = input.title.trim();
    if (!title) return { success: false, error: "Enter what the booking is for." };
    const startTime = combineDateAndTime(input.date, input.start);
    const endTime = combineDateAndTime(input.date, input.end);
    if (!startTime || !endTime) return { success: false, error: "Enter a valid date and time." };
    if (endTime <= startTime) return { success: false, error: "End time has to be after the start." };

    const room = await prisma.meetingRoom.findUnique({ where: { id: input.roomId } });
    if (!room) return { success: false, error: "That resource was not found." };

    if (input.projectId) {
      const project = await prisma.project.findUnique({ where: { id: input.projectId } });
      if (!project) return { success: false, error: "Project not found." };
    }

    const conflict = await prisma.roomReservation.findFirst({
      where: {
        roomId: input.roomId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (conflict) return { success: false, error: "That slot is already booked." };

    await prisma.roomReservation.create({
      data: {
        roomId: input.roomId,
        employeeId,
        projectId: input.projectId || null,
        title: title.slice(0, 140),
        startTime,
        endTime,
        note: input.note?.trim() || null,
      },
    });

    revalidatePath("/rooms");
    return { success: true, message: "Booked." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to reserve room" };
  }
}

export async function cancelReservation(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    const employeeId = session?.user.employeeId;
    if (!employeeId) return { success: false, error: "No employee profile linked to this account." };

    const reservation = await prisma.roomReservation.findUnique({ where: { id } });
    if (!reservation) return { success: false, error: "Reservation not found." };
    if (reservation.employeeId !== employeeId && !isAdmin(session.user.role)) {
      return { success: false, error: "You can only cancel your own reservation." };
    }

    await prisma.roomReservation.delete({ where: { id } });
    revalidatePath("/rooms");
    return { success: true, message: "Reservation cancelled." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to cancel reservation" };
  }
}
