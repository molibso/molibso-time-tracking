import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodayAttendance, recalculateAttendanceTotals } from "@/lib/attendance";
import { notifyAdminsOfForcedClockOut, notifyAdminsOfOvertime, notifyEmployeeOfOvertime } from "@/lib/notifications";
import { getExpectedWorkTargets } from "@/lib/queries/dashboard";
import { endOfDay, startOfDay } from "@/lib/utils";
import { sumWorkedSeconds } from "@/lib/worked-time";

const ONE_HOUR = 60 * 60;
const TWO_HOURS = 2 * ONE_HOUR;

type Shift = {
  id: string;
  clockIn: Date;
  clockOut: Date | null;
  attendanceId: string | null;
  breaks: { startedAt: Date; endedAt: Date | null }[];
};

/** Instant on the open shift when today's worked time reaches `capSeconds`. */
function clockOutAtCap(entries: Shift[], openId: string, from: Date, to: Date, capSeconds: number, now: Date): Date {
  const open = entries.find((entry) => entry.id === openId);
  if (!open) return now;

  const lowBound = Math.max(open.clockIn.getTime(), from.getTime());
  let low = lowBound;
  let high = Math.max(now.getTime(), low);

  const workedAt = (at: number) => {
    const when = new Date(at);
    const stamped = entries.map((entry) => {
      if (entry.id !== openId) return entry;
      return {
        ...entry,
        clockOut: when,
        breaks: entry.breaks.map((item) => ({
          ...item,
          endedAt: item.endedAt && item.endedAt.getTime() <= at ? item.endedAt : when,
        })),
      };
    });
    return sumWorkedSeconds(stamped, { from, to }, when);
  };

  if (workedAt(low) >= capSeconds) return new Date(low);

  for (let step = 0; step < 40 && low < high; step++) {
    const mid = Math.floor((low + high) / 2);
    if (workedAt(mid) >= capSeconds) high = mid;
    else low = mid + 1;
  }
  return new Date(high);
}

/**
 * While someone is clocked in: tell admins once they pass 1 hour of overtime,
 * and clock them out at 2 hours. Overtime is worked time beyond today's expected hours.
 */
export async function enforceDailyOvertime(employeeId: string): Promise<{ clockedOut: boolean; watching: boolean }> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const entries = await prisma.clockEntry.findMany({
    where: {
      employeeId,
      clockIn: { lte: now },
      OR: [{ clockOut: null }, { clockOut: { gte: todayStart } }],
    },
    include: { breaks: true },
  });

  const open = entries.find((entry) => !entry.clockOut);
  if (!open) return { clockedOut: false, watching: false };

  const target = (await getExpectedWorkTargets(employeeId)).today;
  const worked = sumWorkedSeconds(entries, { from: todayStart, to: todayEnd }, now);
  const overtime = worked - target;

  if (overtime >= TWO_HOURS) {
    const at = clockOutAtCap(entries, open.id, todayStart, todayEnd, target + TWO_HOURS, now);
    const closed = await prisma.clockEntry.updateMany({
      where: { id: open.id, clockOut: null },
      data: { clockOut: at },
    });
    if (closed.count === 0) return { clockedOut: false, watching: false };

    await prisma.break.updateMany({
      where: { clockEntryId: open.id, endedAt: null, startedAt: { lte: at } },
      data: { endedAt: at },
    });

    const attendanceId = open.attendanceId ?? (await getOrCreateTodayAttendance(employeeId)).id;
    if (!open.attendanceId) {
      await prisma.clockEntry.update({ where: { id: open.id }, data: { attendanceId } });
    }
    await recalculateAttendanceTotals(attendanceId);
    await notifyEmployeeOfOvertime({ employeeId, at });
    await notifyAdminsOfForcedClockOut({ employeeId, at });
    try {
      revalidatePath("/dashboard");
      revalidatePath("/time-tracking");
      revalidatePath("/attendance");
    } catch {
      // The background sweep has no page to refresh.
    }
    return { clockedOut: true, watching: false };
  }

  if (overtime > ONE_HOUR) {
    const attendanceId = open.attendanceId ?? (await getOrCreateTodayAttendance(employeeId)).id;
    await notifyEmployeeOfOvertime({ employeeId, at: now });
    await notifyAdminsOfOvertime({
      attendanceId,
      employeeId,
      overtimeMinutes: Math.max(60, Math.floor(overtime / 60)),
    });
  }

  return { clockedOut: false, watching: true };
}

/** Apply the 1-hour warning and the 2-hour clock-out to every open shift. */
export async function enforceAllOpenShifts(focusEmployeeId?: string): Promise<{ clockedOut: boolean; watching: boolean }> {
  const open = await prisma.clockEntry.findMany({
    where: { clockOut: null },
    select: { employeeId: true },
    distinct: ["employeeId"],
  });

  let clockedOut = false;
  for (const row of open) {
    const result = await enforceDailyOvertime(row.employeeId);
    if (focusEmployeeId && row.employeeId === focusEmployeeId && result.clockedOut) clockedOut = true;
  }

  const watching = Boolean(focusEmployeeId && open.some((row) => row.employeeId === focusEmployeeId) && !clockedOut);
  return { clockedOut, watching };
}
