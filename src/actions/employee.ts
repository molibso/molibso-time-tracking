"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { employeeCreateSchema, employeeUpdateSchema } from "@/lib/validations/employee";
import type { ActionResult } from "./auth";

async function requireEmployeeManagePermission() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "EMPLOYEE_MANAGE")) {
    throw new Error("You don't have permission to manage employees.");
  }
  return session;
}

function generateEmployeeCode(lastName: string) {
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `EMP-${lastName.slice(0, 3).toUpperCase()}${rand}`;
}

function normalizeRole(role: string) {
  return role === "MANAGER" ? "ADMIN" : role;
}

/**
 * Creates both:
 * 1) User — login account (email + hashed password + role)
 * 2) Employee — team profile linked to that user
 */
export async function createEmployee(
  input: unknown,
): Promise<ActionResult & { employeeId?: string; userId?: string }> {
  try {
    const session = await requireEmployeeManagePermission();
    const parsed = employeeCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const data = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const role = normalizeRole(data.role) as "ADMIN" | "EMPLOYEE" | "MANAGER";

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role,
          isActive: true,
        },
      });

      const emp = await tx.employee.create({
        data: {
          userId: user.id,
          employeeCode: generateEmployeeCode(data.lastName),
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          position: data.position,
          departmentId: null,
          managerId: null,
          employmentType: data.employmentType,
          hireDate: data.hireDate,
          weeklyHours: data.weeklyHours,
          vacationAllowance: data.vacationAllowance,
          status: data.status,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityType: "Employee",
          entityId: emp.id,
          metadata: { email: data.email, userId: user.id },
        },
      });

      return { emp, user };
    });

    revalidatePath("/employees");
    revalidatePath("/dashboard");
    return {
      success: true,
      employeeId: result.emp.id,
      userId: result.user.id,
      message: `${data.firstName} was added to the team. They can sign in with ${data.email.toLowerCase()}.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create employee" };
  }
}

export async function updateEmployee(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireEmployeeManagePermission();
    const parsed = employeeUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const { id, ...data } = parsed.data;

    await prisma.employee.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        position: data.position,
        departmentId: data.departmentId || null,
        managerId: data.managerId || null,
        employmentType: data.employmentType,
        hireDate: data.hireDate,
        weeklyHours: data.weeklyHours,
        vacationAllowance: data.vacationAllowance,
        status: data.status,
      },
    });

    if (data.role) {
      const employee = await prisma.employee.findUnique({ where: { id } });
      if (employee) {
        await prisma.user.update({ where: { id: employee.userId }, data: { role: data.role } });
      }
    }

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entityType: "Employee", entityId: id },
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return { success: true, message: "Employee updated." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update employee" };
  }
}

export async function deactivateEmployee(id: string): Promise<ActionResult> {
  try {
    const session = await requireEmployeeManagePermission();

    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: { status: "TERMINATED" },
      });
      await tx.user.update({ where: { id: employee.userId }, data: { isActive: false } });
      await tx.auditLog.create({
        data: { userId: session.user.id, action: "DEACTIVATE", entityType: "Employee", entityId: id },
      });
    });

    revalidatePath("/employees");
    return { success: true, message: "Employee deactivated." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to deactivate employee" };
  }
}
