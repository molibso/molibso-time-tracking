import { LeaveStatus, LeaveType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calendarDate, endOfDay, startOfDay } from "@/lib/utils";

export function dateKey(date: Date): string {
  const day = calendarDate(date);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const dateNum = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${dateNum}`;
}

/** Approved out-of-office weekdays in the range, and that person's daily hours. */
export async function outOfOfficeContext(employeeId: string, from: Date, to: Date) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { weeklyHours: true },
  });
  const dailySeconds = ((employee?.weeklyHours ?? 40) / 5) * 3600;
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: LeaveStatus.APPROVED,
      type: LeaveType.OUT_OF_OFFICE,
      startDate: { lte: endOfDay(to) },
      endDate: { gte: startOfDay(from) },
    },
    select: { startDate: true, endDate: true },
  });

  const days = new Set<string>();
  for (const leave of leaves) {
    const cursor = startOfDay(calendarDate(leave.startDate));
    const end = startOfDay(calendarDate(leave.endDate));
    while (cursor <= end) {
      const weekday = cursor.getDay();
      if (weekday !== 0 && weekday !== 6) days.add(dateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return { dailySeconds, days };
}

/** Seconds still needed so an out-of-office day reaches a full working day. */
export function topUpSeconds(clockedSeconds: number, dailySeconds: number, counted: boolean) {
  if (!counted) return 0;
  return Math.max(0, Math.round(dailySeconds) - Math.max(0, Math.floor(clockedSeconds)));
}
