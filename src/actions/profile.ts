"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, employeeProfileSchema } from "@/lib/validations/employee";
import type { ActionResult } from "./auth";

export async function updateOwnProfile(input: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "No employee profile linked to this account." };

    const parsed = employeeProfileSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    await prisma.employee.update({
      where: { id: session.user.employeeId },
      data: {
        phone: parsed.data.phone,
        avatarUrl: parsed.data.avatarUrl || null,
      },
    });

    revalidatePath("/profile");
    return { success: true, message: "Profile updated." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update profile" };
  }
}

export async function changeOwnPassword(input: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.id) return { success: false, error: "Sign in again to change your password." };

    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return { success: false, error: "Account not found." };

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) return { success: false, error: "Current password is incorrect." };

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return { success: true, message: "Password updated." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update password" };
  }
}
