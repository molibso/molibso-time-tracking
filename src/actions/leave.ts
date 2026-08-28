"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { recalculateAttendanceTotals } from "@/lib/attendance";
import { leaveRequestSchema, leaveReviewSchema, correctionReviewSchema } from "@/lib/validations/leave";
import type { ActionResult } from "./auth";

function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function createLeaveRequest(input: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "No employee profile linked to this account." };

    const parsed = leaveRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { type, startDate, endDate, reason } = parsed.data;

    const totalDays =
      type === "HALF_DAY" ? 0.5 : businessDaysBetween(startDate, endDate);

    if (type === "VACATION") {
      const employee = await prisma.employee.findUnique({ where: { id: session.user.employeeId } });
      if (employee) {
        const used = await prisma.leaveRequest.aggregate({
          where: { employeeId: employee.id, type: "VACATION", status: "APPROVED" },
          _sum: { totalDays: true },
        });
        const remaining = employee.vacationAllowance - (used._sum.totalDays ?? 0);
        if (totalDays > remaining) {
          return { success: false, error: `Only ${remaining} vacation day(s) remaining.` };
        }
      }
    }

    await prisma.leaveRequest.create({
      data: {
        employeeId: session.user.employeeId,
        type,
        startDate,
        endDate,
        totalDays,
        reason,
      },
    });

    revalidatePath("/leave");
    revalidatePath("/dashboard");
    return { success: true, message: "Leave request submitted." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to submit leave request" };
  }
}

export async function reviewLeaveRequest(input: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session || !hasPermission(session.user.role, "LEAVE_APPROVE")) {
      return { success: false, error: "You don't have permission to review leave requests." };
    }

    const parsed = leaveReviewSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const leave = await prisma.leaveRequest.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        reviewComment: parsed.data.reviewComment,
        reviewedAt: new Date(),
        reviewedById: session.user.employeeId,
      },
      include: { employee: { include: { user: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: leave.employee.userId,
        type: leave.status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
        title: leave.status === "APPROVED" ? "Leave request approved" : "Leave request rejected",
        message: `Your ${leave.type.toLowerCase().replace("_", " ")} request for ${leave.totalDays} day(s) was ${leave.status.toLowerCase()}.`,
        link: "/leave",
      },
    });

    revalidatePath("/leave");
    return { success: true, message: `Leave request ${leave.status.toLowerCase()}.` };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to review leave request" };
  }
}

export async function cancelLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "Not authenticated" };

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave || leave.employeeId !== session.user.employeeId) {
      return { success: false, error: "Leave request not found." };
    }
    if (leave.status !== "PENDING") {
      return { success: false, error: "Only pending requests can be cancelled." };
    }

    await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    revalidatePath("/leave");
    return { success: true, message: "Leave request cancelled." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to cancel leave request" };
  }
}

export async function reviewCorrectionRequest(input: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session || !hasPermission(session.user.role, "ATTENDANCE_EDIT")) {
      return { success: false, error: "You don't have permission to review corrections." };
    }

    const parsed = correctionReviewSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const correction = await prisma.correctionRequest.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        reviewComment: parsed.data.reviewComment,
        reviewedAt: new Date(),
        reviewedById: session.user.employeeId,
      },
    });

    if (correction.status === "APPROVED") {
      const entry = await prisma.clockEntry.findFirst({ where: { attendanceId: correction.attendanceId } });
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
      await recalculateAttendanceTotals(correction.attendanceId);
    }

    revalidatePath("/attendance");
    return { success: true, message: `Correction ${correction.status.toLowerCase()}.` };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to review correction" };
  }
}
