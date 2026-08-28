import { prisma } from "@/lib/prisma";
import { notifyAdminsOfOvertime } from "@/lib/notifications";
import { minutesBetween } from "@/lib/utils";

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
  const settings = await prisma.companySettings.findUnique({ where: { id: "global" } });
  const overtimeThresholdMinutes = (settings?.overtimeThresholdDaily ?? 8) * 60;

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: { employeeId: true },
  });
  if (!attendance) return null;

  const entries = await prisma.clockEntry.findMany({
    where: { attendanceId },
    include: { breaks: true },
  });

  let workedMinutes = 0;
  let breakMinutes = 0;

  for (const entry of entries) {
    if (entry.clockOut) {
      workedMinutes += minutesBetween(entry.clockIn, entry.clockOut);
    }
    for (const b of entry.breaks) {
      if (b.endedAt) {
        const dur = minutesBetween(b.startedAt, b.endedAt);
        breakMinutes += dur;
        workedMinutes -= dur;
      }
    }
  }

  const overtimeMinutes = Math.max(0, workedMinutes - overtimeThresholdMinutes);

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      totalWorkedMinutes: Math.max(0, workedMinutes),
      breakMinutes,
      overtimeMinutes,
    },
  });

  await notifyAdminsOfOvertime({
    attendanceId,
    employeeId: attendance.employeeId,
    overtimeMinutes,
  });

  return updated;
}
