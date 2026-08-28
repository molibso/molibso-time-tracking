import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiPermission, requireApiUser } from "@/lib/api/auth";
import { fail, notFound, ok, serverError } from "@/lib/api/response";
import { employeeUpdateSchema } from "@/lib/validations/employee";
import { hasPermission } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/employees/:id */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { user, error } = await requireApiUser(req);
    if (error || !user) return error!;
    const { id } = await ctx.params;

    const isBoss = hasPermission(user.role, "EMPLOYEE_VIEW_ALL");
    if (!isBoss && user.employeeId !== id) return fail("Forbidden", 403);

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { email: true, role: true, isActive: true } } },
    });
    if (!employee) return notFound("Employee not found");

    return ok({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.user.email,
      role: employee.user.role,
      position: employee.position,
      phone: employee.phone,
      status: employee.status,
      employmentType: employee.employmentType,
      hireDate: employee.hireDate,
      weeklyHours: employee.weeklyHours,
      vacationAllowance: employee.vacationAllowance,
      employeeCode: employee.employeeCode,
    });
  } catch (err) {
    return serverError(err);
  }
}

/** PATCH /api/v1/employees/:id */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { user, error } = await requireApiPermission(req, "EMPLOYEE_MANAGE");
    if (error || !user) return error!;
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = employeeUpdateSchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400, parsed.error.flatten());
    }

    const { id: _id, role, departmentId: _d, managerId: _m, email: _e, ...rest } = parsed.data;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...rest,
        phone: rest.phone,
        position: rest.position,
      },
    });

    if (role) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { role: role === "MANAGER" ? "ADMIN" : role },
      });
    }

    return ok({ id: employee.id }, { message: "Employee updated." });
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/v1/employees/:id — deactivate (soft). */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { user, error } = await requireApiPermission(req, "EMPLOYEE_MANAGE");
    if (error || !user) return error!;
    const { id } = await ctx.params;

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: { status: "TERMINATED" },
      });
      await tx.user.update({ where: { id: emp.userId }, data: { isActive: false } });
      await tx.auditLog.create({
        data: { userId: user.id, action: "DEACTIVATE", entityType: "Employee", entityId: id },
      });
      return emp;
    });

    return ok({ id: employee.id }, { message: "Employee deactivated." });
  } catch (err) {
    return serverError(err);
  }
}
