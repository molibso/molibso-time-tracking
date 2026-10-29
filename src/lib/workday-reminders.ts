import { LeaveStatus, LeaveType, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { owedSecondsOnDay, toDaysOff } from "@/lib/expected-hours";
import { notifyOnceToday } from "@/lib/notifications";
import { endOfDay, startOfDay } from "@/lib/utils";
import { sumBreakSeconds, sumWorkedSeconds } from "@/lib/worked-time";

const SIX_HOURS = 6 * 60 * 60;
const FULL_DAY_OFF = [LeaveType.VACATION, LeaveType.SICK, LeaveType.PERSONAL, LeaveType.HALF_DAY];
const REMINDER_LEAVE = [...FULL_DAY_OFF, LeaveType.OUT_OF_OFFICE];

function timeToday(hhmm: string, now: Date): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const at = new Date(now);
  at.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return at;
}

/** Send the clock-in, clock-out, and break reminders the settings switches control. Once each, per person, per day. */
export async function sendWorkdayReminders() {
  const settings = await prisma.companySettings.findUnique({ where: { id: "global" } });
  if (!settings) return;
  const clockInOn = settings.notifyClockInReminder;
  const clockOutOn = settings.notifyClockOutReminder;
  const breakOn = settings.notifyBreakReminder;
  if (!clockInOn && !clockOutOn && !breakOn) return;

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const dayStart = timeToday(settings.workDayStartTime, now);
  const dayEnd = timeToday(settings.workDayEndTime, now);
  const breakTarget = settings.breakDurationMinutes * 60;

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, userId: true, weeklyHours: true },
  });
  if (employees.length === 0) return;
  const ids = employees.map((employee) => employee.id);

  const [entries, leaves, holidays] = await Promise.all([
    prisma.clockEntry.findMany({
      where: {
        employeeId: { in: ids },
        clockIn: { lte: now },
        OR: [{ clockOut: null }, { clockOut: { gte: todayStart } }],
      },
      include: { breaks: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: ids },
        status: LeaveStatus.APPROVED,
        type: { in: REMINDER_LEAVE },
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      select: { employeeId: true, type: true, dayPart: true, startDate: true, endDate: true },
    }),
    prisma.holiday.findMany({
      where: { isPaid: true, date: { lte: todayEnd } },
      select: { date: true, endDate: true },
    }),
  ]);

  for (const employee of employees) {
    const mine = entries.filter((entry) => entry.employeeId === employee.id);
    const open = mine.find((entry) => !entry.clockOut);
    const onBreak = open?.breaks.some((item) => !item.endedAt) ?? false;
    const mineLeaves = leaves.filter((leave) => leave.employeeId === employee.id);
    const outToday = mineLeaves.some((leave) => leave.type === LeaveType.OUT_OF_OFFICE);
    const owed = owedSecondsOnDay(
      employee.weeklyHours,
      now,
      toDaysOff(
        mineLeaves.filter((leave) => leave.type !== LeaveType.OUT_OF_OFFICE),
        holidays,
        todayStart,
      ),
    );

    if (clockInOn && !outToday && now >= dayStart && owed > 0 && mine.length === 0) {
      await notifyOnceToday({
        userId: employee.userId,
        type: NotificationType.CLOCK_IN_REMINDER,
        title: "Clock in reminder",
        message: "The workday has started and you are not clocked in.",
        link: "/time-tracking",
        at: now,
      });
    }

    if (clockOutOn && now >= dayEnd && open) {
      await notifyOnceToday({
        userId: employee.userId,
        type: NotificationType.CLOCK_OUT_REMINDER,
        title: "Clock out reminder",
        message: "The workday has ended and you are still clocked in.",
        link: "/time-tracking",
        at: now,
      });
    }

    if (breakOn && open && !onBreak) {
      const worked = sumWorkedSeconds(mine, { from: todayStart, to: todayEnd }, now);
      const rested = sumBreakSeconds(mine, now);
      if (worked >= SIX_HOURS && rested < breakTarget) {
        await notifyOnceToday({
          userId: employee.userId,
          type: NotificationType.BREAK_REMINDER,
          title: "Break reminder",
          message: "You have worked 6 hours and still owe the usual break.",
          link: "/time-tracking",
          at: now,
        });
      }
    }
  }
}
