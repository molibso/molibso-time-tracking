"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodayAttendance, recalculateAttendanceTotals } from "@/lib/attendance";
import { correctionRequestSchema } from "@/lib/validations/leave";
import type { ActionResult } from "./auth";

async function requireEmployee() {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("No employee profile linked to this account.");
  return { session, employeeId: session.user.employeeId };
}

export async function clockIn(): Promise<ActionResult> {
  try {
    const { employeeId } = await requireEmployee();

    const openEntry = await prisma.clockEntry.findFirst({
      where: { employeeId, clockOut: null },
    });
    if (openEntry) return { success: false, error: "You're already clocked in." };

    const attendance = await getOrCreateTodayAttendance(employeeId);

    await prisma.clockEntry.create({
      data: { employeeId, clockIn: new Date(), source: "WEB", attendanceId: attendance.id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/time-tracking");
    return { success: true, message: "Clocked in. Have a great shift!" };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to clock in" };
  }
}

export async function clockOut(): Promise<ActionResult> {
  try {
    const { employeeId } = await requireEmployee();

    const openEntry = await prisma.clockEntry.findFirst({
      where: { employeeId, clockOut: null },
      include: { breaks: true },
    });
    if (!openEntry) return { success: false, error: "You're not currently clocked in." };

    const openBreak = openEntry.breaks.find((b) => !b.endedAt);
    if (openBreak) {
      return { success: false, error: "End your current break before clocking out." };
    }

    const now = new Date();
    await prisma.clockEntry.update({
      where: { id: openEntry.id },
      data: { clockOut: now },
    });

    await recalculateAttendanceTotals(openEntry.attendanceId!);

    revalidatePath("/dashboard");
    revalidatePath("/time-tracking");
    return { success: true, message: "Clocked out. Nice work today!" };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to clock out" };
  }
}

export async function startBreak(reason?: string): Promise<ActionResult> {
  try {
    const { employeeId } = await requireEmployee();

    const openEntry = await prisma.clockEntry.findFirst({
      where: { employeeId, clockOut: null },
      include: { breaks: true },
    });
    if (!openEntry) return { success: false, error: "Clock in before starting a break." };

    if (openEntry.breaks.some((b) => !b.endedAt)) {
      return { success: false, error: "You're already on a break." };
    }

    await prisma.break.create({
      data: { clockEntryId: openEntry.id, startedAt: new Date(), reason },
    });

    revalidatePath("/dashboard");
    revalidatePath("/time-tracking");
    return { success: true, message: "Break started." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to start break" };
  }
}

export async function endBreak(): Promise<ActionResult> {
  try {
    const { employeeId } = await requireEmployee();

    const openEntry = await prisma.clockEntry.findFirst({
      where: { employeeId, clockOut: null },
      include: { breaks: true },
    });
    if (!openEntry) return { success: false, error: "No active shift found." };

    const openBreak = openEntry.breaks.find((b) => !b.endedAt);
    if (!openBreak) return { success: false, error: "You don't have an active break." };

    await prisma.break.update({ where: { id: openBreak.id }, data: { endedAt: new Date() } });

    revalidatePath("/dashboard");
    revalidatePath("/time-tracking");
    return { success: true, message: "Break ended. Back to work!" };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to end break" };
  }
}

export async function requestCorrection(input: unknown): Promise<ActionResult> {
  try {
    const { employeeId } = await requireEmployee();
    const parsed = correctionRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const attendance = await prisma.attendance.findUnique({ where: { id: parsed.data.attendanceId } });
    if (!attendance) return { success: false, error: "Attendance record not found." };

    function toDateTime(time?: string) {
      if (!time) return undefined;
      const [h, m] = time.split(":").map(Number);
      const d = new Date(attendance!.date);
      d.setHours(h, m, 0, 0);
      return d;
    }

    await prisma.correctionRequest.create({
      data: {
        employeeId,
        attendanceId: parsed.data.attendanceId,
        requestedClockIn: toDateTime(parsed.data.requestedClockIn),
        requestedClockOut: toDateTime(parsed.data.requestedClockOut),
        reason: parsed.data.reason,
      },
    });

    revalidatePath("/attendance");
    return { success: true, message: "Correction request submitted for review." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to submit correction request" };
  }
}
