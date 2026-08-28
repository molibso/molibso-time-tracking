import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { signApiToken } from "@/lib/api/jwt";
import { fail, ok, serverError } from "@/lib/api/response";

/** POST /api/v1/auth/login — exchange email/password for a Bearer API token. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400, parsed.error.flatten());
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user || !user.isActive) return fail("Incorrect email or password.", 401);
    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return fail("Incorrect email or password.", 401);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signApiToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id ?? null,
    });

    return ok({
      token,
      tokenType: "Bearer",
      expiresIn: "8h",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.id ?? null,
        name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
