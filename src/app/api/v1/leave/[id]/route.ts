import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiEmployee, requireApiPermission } from "@/lib/api/auth";
import { fail, notFound, ok, serverError } from "@/lib/api/response";
import { leaveReviewSchema } from "@/lib/validations/leave";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/v1/leave/:id — cancel own pending leave, or review (boss). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    // Review path: { status: APPROVED|REJECTED, reviewComment? }
    if (body.status === "APPROVED" || body.status === "REJECTED") {
      const { user, error } = await requireApiPermission(req, "LEAVE_APPROVE");
      if (error || !user) return error!;

      const parsed = leaveReviewSchema.safeParse({ id, ...body });
      if (!parsed.success) {
        return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400);
      }

      const leave = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: parsed.data.status,
          reviewComment: parsed.data.reviewComment,
          reviewedAt: new Date(),
          reviewedById: user.employeeId,
        },
        include: { employee: true },
      });

      await prisma.notification.create({
        data: {
          userId: leave.employee.userId,
          type: leave.status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
          title: leave.status === "APPROVED" ? "Leave request approved" : "Leave request rejected",
          message: `Your ${leave.type.toLowerCase().replace("_", " ")} request for ${leave.totalDays} day(s) was ${leave.status.toLowerCase()}.`,
          link: "/leave",
        },
      });

      return ok(leave, { message: `Leave request ${leave.status.toLowerCase()}.` });
    }

    // Cancel path: { status: CANCELLED }
    if (body.status === "CANCELLED") {
      const { user, error } = await requireApiEmployee(req);
      if (error || !user) return error!;

      const leave = await prisma.leaveRequest.findUnique({ where: { id } });
      if (!leave || leave.employeeId !== user.employeeId) return notFound("Leave request not found.");
      if (leave.status !== "PENDING") return fail("Only pending requests can be cancelled.");

      const updated = await prisma.leaveRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return ok(updated, { message: "Leave request cancelled." });
    }

    return fail("Provide status: APPROVED, REJECTED, or CANCELLED.");
  } catch (err) {
    return serverError(err);
  }
}
