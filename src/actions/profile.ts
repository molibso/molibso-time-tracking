"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeProfileSchema } from "@/lib/validations/employee";
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
