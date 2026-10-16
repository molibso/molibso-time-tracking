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
          title: { contains: name },
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
