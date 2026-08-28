import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiPermission, requireApiUser } from "@/lib/api/auth";
import { created, fail, ok, serverError } from "@/lib/api/response";
import { employeeCreateSchema } from "@/lib/validations/employee";
import { hasPermission } from "@/lib/rbac";

function generateEmployeeCode(lastName: string) {
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `EMP-${lastName.slice(0, 3).toUpperCase()}${rand}`;
}

/** GET /api/v1/employees — list team (bosses) or self. */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireApiUser(req);
    if (error || !user) return error!;

    const isBoss = hasPermission(user.role, "EMPLOYEE_VIEW_ALL");
    const employees = await prisma.employee.findMany({
      where: isBoss ? undefined : { id: user.employeeId ?? "__none__" },
      include: {
        user: { select: { email: true, role: true, isActive: true } },
      },
      orderBy: { firstName: "asc" },
    });

    return ok(
      employees.map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.user.email,
        role: e.user.role === "MANAGER" ? "ADMIN" : e.user.role,
        position: e.position,
        phone: e.phone,
        status: e.status,
        employmentType: e.employmentType,
        hireDate: e.hireDate,
        weeklyHours: e.weeklyHours,
        vacationAllowance: e.vacationAllowance,
        employeeCode: e.employeeCode,
        userId: e.userId,
        isActive: e.user.isActive,
      })),
    );
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/v1/employees — create teammate (boss only).
 * Writes both User (login + password hash) and Employee (team profile) in one transaction.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireApiPermission(req, "EMPLOYEE_MANAGE");
    if (error || !user) return error!;

    const body = await req.json();
    const parsed = employeeCreateSchema.safeParse({ ...body, departmentId: null, managerId: null });
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400, parsed.error.flatten());
    }
    const data = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) return fail("An account with this email already exists.", 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const role = data.role === "MANAGER" ? "ADMIN" : data.role;

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role,
          isActive: true,
        },
      });
      const emp = await tx.employee.create({
        data: {
          userId: newUser.id,
          employeeCode: generateEmployeeCode(data.lastName),
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          position: data.position,
          employmentType: data.employmentType,
          hireDate: data.hireDate,
          weeklyHours: data.weeklyHours,
          vacationAllowance: data.vacationAllowance,
          status: data.status,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entityType: "Employee",
          entityId: emp.id,
          metadata: { email: data.email, userId: newUser.id },
        },
      });
      return { emp, newUser };
    });

    return created(
      {
        id: result.emp.id,
        employeeId: result.emp.id,
        userId: result.newUser.id,
        email: result.newUser.email,
        role: result.newUser.role === "MANAGER" ? "ADMIN" : result.newUser.role,
      },
      `${data.firstName} was added to the team and can sign in with ${result.newUser.email}.`,
    );
  } catch (err) {
    return serverError(err);
  }
}
