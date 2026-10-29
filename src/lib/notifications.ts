import { NotificationType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDuration, startOfDay } from "@/lib/utils";

const OVERTIME_NOTIFY_MINUTES = 60;

/** Notify all active admins when an employee exceeds 1 hour of overtime in a day. */
export async function notifyAdminsOfOvertime(opts: {
  attendanceId: string;
  employeeId: string;
  overtimeMinutes: number;
}) {
  if (opts.overtimeMinutes < OVERTIME_NOTIFY_MINUTES) return;

  const settings = await prisma.companySettings.findUnique({
    where: { id: "global" },
    select: { notifyOvertimeAlert: true },
  });
  if (settings && !settings.notifyOvertimeAlert) return;

  const [employee, attendance] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: opts.employeeId },
      select: { firstName: true, lastName: true },
    }),
    prisma.attendance.findUnique({
      where: { id: opts.attendanceId },
      select: { date: true },
    }),
  ]);
  if (!employee || !attendance) return;

  const dayStart = startOfDay(attendance.date);
  const name = `${employee.firstName} ${employee.lastName}`;
  const overtimeLabel = formatDuration(opts.overtimeMinutes * 60);
  const link = `/attendance?employeeId=${opts.employeeId}`;

  const admins = await prisma.user.findMany({
    where: { isActive: true, role: { in: [Role.ADMIN, Role.MANAGER] } },
    select: { id: true },
  });

  await Promise.all(
    admins.map(async (admin) => {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: admin.id,
          type: NotificationType.OVERTIME_ALERT,
          link,
          createdAt: { gte: dayStart },
          title: `Overtime alert — ${name}`,
        },
      });
      if (existing) return;

      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: NotificationType.OVERTIME_ALERT,
          title: `Overtime alert — ${name}`,
          message: `${name} logged ${overtimeLabel} overtime today.`,
          link,
        },
      });
    }),
  );
}

/** Warn the person once they pass 1 hour of overtime, before the shift is stopped. */
export async function notifyEmployeeOfOvertime(opts: { employeeId: string; at: Date }) {
  const settings = await prisma.companySettings.findUnique({
    where: { id: "global" },
    select: { notifyOvertimeAlert: true },
  });
  if (settings && !settings.notifyOvertimeAlert) return;

  const employee = await prisma.employee.findUnique({
    where: { id: opts.employeeId },
    select: { userId: true },
  });
  if (!employee) return;

  const dayStart = startOfDay(opts.at);
  const existing = await prisma.notification.findFirst({
    where: {
      userId: employee.userId,
      type: NotificationType.OVERTIME_ALERT,
      title: "Overtime warning",
      createdAt: { gte: dayStart },
    },
  });
  if (existing) return;

  await prisma.notification.create({
    data: {
      userId: employee.userId,
      type: NotificationType.OVERTIME_ALERT,
      title: "Overtime warning",
      message: "You have more than 1 hour of overtime. You will be clocked out at 2 hours.",
      link: "/time-tracking",
    },
  });
}

/** Tell admins the shift was stopped at 2 hours of overtime. */
export async function notifyAdminsOfForcedClockOut(opts: { employeeId: string; at: Date }) {
  const settings = await prisma.companySettings.findUnique({
    where: { id: "global" },
    select: { notifyOvertimeAlert: true },
  });
  if (settings && !settings.notifyOvertimeAlert) return;

  const employee = await prisma.employee.findUnique({
    where: { id: opts.employeeId },
    select: { firstName: true, lastName: true },
  });
  if (!employee) return;

  const name = `${employee.firstName} ${employee.lastName}`;
  const title = `Clocked out — ${name}`;
  const link = `/attendance?employeeId=${opts.employeeId}`;
  const dayStart = startOfDay(opts.at);

  const admins = await prisma.user.findMany({
    where: { isActive: true, role: { in: [Role.ADMIN, Role.MANAGER] } },
    select: { id: true },
  });

  await Promise.all(
    admins.map(async (admin) => {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: admin.id,
          type: NotificationType.OVERTIME_ALERT,
          title,
          createdAt: { gte: dayStart },
        },
      });
      if (existing) return;

      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: NotificationType.OVERTIME_ALERT,
          title,
          message: `${name} was clocked out after 2 hours of overtime.`,
          link,
        },
      });
    }),
  );
}

/** One notification per person, per title, per day. */
export async function notifyOnceToday(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  at?: Date;
}) {
  const dayStart = startOfDay(opts.at ?? new Date());
  const existing = await prisma.notification.findFirst({
    where: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      createdAt: { gte: dayStart },
    },
  });
  if (existing) return;

  await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      link: opts.link,
    },
  });
}

/** Tell every boss that an expense claim is waiting. */
export async function notifyAdminsOfExpenseClaim(opts: { employeeName: string; destination: string }) {
  const admins = await prisma.user.findMany({
    where: { isActive: true, role: { in: [Role.ADMIN, Role.MANAGER] } },
    select: { id: true },
  });
  const title = `Expense claim — ${opts.employeeName}`;
  const message = `${opts.employeeName} submitted expenses for ${opts.destination}.`;
  await Promise.all(
    admins.map((admin) =>
      notifyOnceToday({
        userId: admin.id,
        type: NotificationType.SYSTEM,
        title,
        message,
        link: "/expenses",
      }),
    ),
  );
}

/** Notify an employee when a task is assigned to them. */
export async function notifyUserNewTask(opts: {
  userId: string;
  taskId: string;
  taskTitle: string;
  dueDate?: Date | null;
}) {
  const due = opts.dueDate
    ? ` Due ${opts.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
    : "";

  await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: NotificationType.NEW_TASK,
      title: "New task assigned",
      message: `"${opts.taskTitle}" was assigned to you.${due}`,
      link: "/tasks",
    },
  });
}
