import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { created, fail, serverError } from "@/lib/api/response";
import { signApiToken } from "@/lib/api/jwt";

const bootstrapSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  position: z.string().min(1).max(100).default("Administrator"),
});

/**
 * POST /api/v1/auth/bootstrap
 * Creates the first boss account when the database has no users.
 * Disabled once any user exists — use POST /employees after that.
 */
export async function POST(req: NextRequest) {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return fail("Bootstrap is only available when no users exist. Use POST /employees instead.", 403);
    }

    const body = await req.json();
    const parsed = bootstrapSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();
    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      await tx.companySettings.upsert({
        where: { id: "global" },
        update: {},
        create: { id: "global", companyName: "molibso GmbH" },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "ADMIN",
          isActive: true,
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          employeeCode: "EMP-ADMIN001",
          firstName: data.firstName,
          lastName: data.lastName,
          position: data.position,
          employmentType: "FULL_TIME",
          hireDate: new Date(),
          weeklyHours: 40,
          vacationAllowance: 30,
        },
      });

      return { user, employee };
    });

    const token = await signApiToken({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      employeeId: result.employee.id,
    });

    return created(
      {
        token,
        tokenType: "Bearer",
        expiresIn: "8h",
        user: {
          id: result.user.id,
          email: result.user.email,
          role: "ADMIN",
          employeeId: result.employee.id,
          name: `${data.firstName} ${data.lastName}`,
        },
      },
      "First admin account created.",
    );
  } catch (err) {
    return serverError(err);
  }
}
