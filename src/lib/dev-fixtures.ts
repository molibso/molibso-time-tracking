import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEV_ACCOUNTS } from "@/lib/dev-login";

const DEV_PASSWORD = "local-dev";
const DEMO_PROJECT = "Local demo";

type SessionUser = {
  id: string;
  email: string;
  role: Role;
  name: string;
  employeeId: string | null;
};

function atMidnight(offsetDays: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

async function upsertPerson(input: {
  email: string;
  role: Role;
  code: string;
  firstName: string;
  lastName: string;
  position: string;
  passwordHash: string;
  managerId?: string | null;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: { role: input.role, isActive: true, passwordHash: input.passwordHash },
    create: {
      email: input.email,
      role: input.role,
      isActive: true,
      passwordHash: input.passwordHash,
    },
  });

  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      position: input.position,
      status: "ACTIVE",
      managerId: input.managerId ?? null,
    },
    create: {
      userId: user.id,
      employeeCode: input.code,
      firstName: input.firstName,
      lastName: input.lastName,
      position: input.position,
      hireDate: new Date("2024-03-01"),
      weeklyHours: 40,
      vacationAllowance: input.role === "ADMIN" ? 30 : 20,
      status: "ACTIVE",
      managerId: input.managerId ?? null,
    },
  });

  return { user, employee };
}

async function ensureWorkedDay(employeeId: string, offsetDays: number, startHour: number, endHour: number) {
  const date = atMidnight(offsetDays);
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });
  if (existing) return;

  const clockIn = new Date(date);
  clockIn.setHours(startHour, 0, 0, 0);
  const clockOut = new Date(date);
  clockOut.setHours(endHour, 30, 0, 0);
  const minutes = (endHour - startHour) * 60 + 30;

  const attendance = await prisma.attendance.create({
    data: {
      employeeId,
      date,
      status: "PRESENT",
      totalWorkedMinutes: minutes,
      breakMinutes: 0,
      overtimeMinutes: Math.max(0, minutes - 8 * 60),
    },
  });

  await prisma.clockEntry.create({
    data: {
      employeeId,
      attendanceId: attendance.id,
      clockIn,
      clockOut,
      source: "MANUAL",
    },
  });
}

async function ensureSampleWork(adminId: string, employeeId: string) {
  await ensureWorkedDay(adminId, -1, 8, 17);
  await ensureWorkedDay(adminId, -2, 9, 16);
  await ensureWorkedDay(employeeId, -1, 9, 18);
  await ensureWorkedDay(employeeId, -2, 9, 15);

  const pending = await prisma.leaveRequest.findFirst({
    where: { employeeId, status: "PENDING" },
  });
  if (!pending) {
    const start = atMidnight(10);
    const end = atMidnight(12);
    await prisma.leaveRequest.create({
      data: {
        employeeId,
        type: "VACATION",
        startDate: start,
        endDate: end,
        totalDays: 3,
        status: "PENDING",
        reason: "Dummy request so the admin approvals tab has something to review.",
      },
    });
  }

  try {
    let project = await prisma.project.findFirst({ where: { name: DEMO_PROJECT } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: DEMO_PROJECT,
          description: "Sample project for local development.",
          status: "ACTIVE",
          createdById: adminId,
          members: { create: [{ employeeId: adminId }, { employeeId }] },
        },
      });

      await prisma.task.create({
        data: {
          title: "Prepare the demo",
          description: "Dummy task assigned to the employee.",
          projectId: project.id,
          assigneeId: employeeId,
          createdById: adminId,
          priority: "MEDIUM",
          status: "TODO",
          kind: "TASK",
          assignments: { create: [{ employeeId }] },
        },
      });

      await prisma.task.create({
        data: {
          title: "Meeting for the kickoff",
          description: "Dummy meeting you can clock in and out of.",
          projectId: project.id,
          assigneeId: employeeId,
          createdById: adminId,
          priority: "HIGH",
          status: "TODO",
          kind: "MEETING",
          assignments: { create: [{ employeeId: adminId }, { employeeId }] },
        },
      });
    }

    const room = await prisma.meetingRoom.findFirst({ where: { name: "Studio" } });
    if (!room) {
      const created = await prisma.meetingRoom.create({
        data: { name: "Studio", location: "Ground floor", capacity: 6 },
      });
      const start = atMidnight(1);
      start.setHours(10, 0, 0, 0);
      const end = atMidnight(1);
      end.setHours(11, 0, 0, 0);
      await prisma.roomReservation.create({
        data: {
          roomId: created.id,
          employeeId,
          projectId: project.id,
          title: "Dummy reservation",
          startTime: start,
          endTime: end,
        },
      });
    }
  } catch (error) {
    console.warn("Local dummy tasks and rooms were skipped. Apply migrations if those pages should load.", error);
  }
}

let fixtures: Promise<void> | null = null;

async function seedFixtures() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  await prisma.companySettings.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", companyName: "molibso GmbH" },
  });

  const admin = await upsertPerson({
    email: "admin@local.dev",
    role: "ADMIN",
    code: "DEV-ADMIN",
    firstName: "Alex",
    lastName: "Admin",
    position: "Boss",
    passwordHash,
  });

  const employee = await upsertPerson({
    email: "employee@local.dev",
    role: "EMPLOYEE",
    code: "DEV-EMP",
    firstName: "Eva",
    lastName: "Employee",
    position: "Engineer",
    passwordHash,
    managerId: admin.employee.id,
  });

  await ensureSampleWork(admin.employee.id, employee.employee.id);
}

export async function ensureDevFixtures(): Promise<void> {
  if (!fixtures) {
    fixtures = seedFixtures().catch((error) => {
      fixtures = null;
      throw error;
    });
  }
  await fixtures;
}

export async function devSessionUser(email: string): Promise<SessionUser | null> {
  await ensureDevFixtures();
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { employee: true },
  });
  if (!user?.isActive || !DEV_ACCOUNTS.some((account) => account.email === user.email)) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email,
    employeeId: user.employee?.id ?? null,
  };
}
