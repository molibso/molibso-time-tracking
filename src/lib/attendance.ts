import { prisma } from "@/lib/prisma";
import { notifyAdminsOfOvertime } from "@/lib/notifications";
import { getExpectedWorkTargets } from "@/lib/queries/dashboard";
import { sumBreakSeconds, sumWorkedSeconds } from "@/lib/worked-time";

export async function getOrCreateTodayAttendance(employeeId: string) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date } },
    update: {},
    create: { employeeId, date, status: "PRESENT" },
  });
}

export async function recalculateAttendanceTotals(attendanceId: string) {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { employeeId: true },
  });
  if (!attendance) return null;

  const entries = await prisma.clockEntry.findMany({
    where: { attendanceId },
    include: { breaks: true },
  });

  const closed = entries.filter((entry) => entry.clockOut);
  const workedSeconds = sumWorkedSeconds(closed);
  const breakSeconds = sumBreakSeconds(closed);

  const workedMinutes = Math.round(workedSeconds / 60);
  const breakMinutes = Math.round(breakSeconds / 60);
  const expectedToday = (await getExpectedWorkTargets(attendance.employeeId)).today;
  const owedOvertimeMinutes = Math.max(0, workedMinutes - Math.round(expectedToday / 60));

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      totalWorkedMinutes: Math.max(0, workedMinutes),
      breakMinutes,
      overtimeMinutes: owedOvertimeMinutes,
    },
  });

  await notifyAdminsOfOvertime({
    attendanceId,
    employeeId: attendance.employeeId,
    overtimeMinutes: owedOvertimeMinutes,
  });

  return updated;
}
