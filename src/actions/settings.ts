"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { companySettingsSchema, departmentSchema, holidaySchema } from "@/lib/validations/settings";
import type { ActionResult } from "./auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "SETTINGS_MANAGE")) {
    throw new Error("Only administrators can change these settings.");
  }
  return session;
}

export async function updateCompanySettings(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = companySettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    await prisma.companySettings.upsert({
      where: { id: "global" },
      update: parsed.data,
      create: { id: "global", ...parsed.data },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entityType: "CompanySettings", entityId: "global" },
    });

    revalidatePath("/settings");
    return { success: true, message: "Settings saved." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to save settings" };
  }
}

export async function createDepartment(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = departmentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    await prisma.department.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        managerId: parsed.data.managerId || null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/employees");
    return { success: true, message: "Department created." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create department" };
  }
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.department.delete({ where: { id } });
    revalidatePath("/settings");
    revalidatePath("/employees");
    return { success: true, message: "Department removed." };
  } catch (err: any) {
    return { success: false, error: "Failed to remove department. Reassign its employees first." };
  }
}

export async function createHoliday(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = holidaySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const start = parsed.data.date;
    const end = parsed.data.endDate && parsed.data.endDate > start ? parsed.data.endDate : null;

    await prisma.holiday.create({
      data: {
        name: parsed.data.name,
        date: start,
        endDate: end,
        isPaid: parsed.data.isPaid,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/attendance");
    return { success: true, message: "Holiday added." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to add holiday" };
  }
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.holiday.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true, message: "Holiday removed." };
  } catch (err: any) {
    return { success: false, error: "Failed to remove holiday." };
  }
}
