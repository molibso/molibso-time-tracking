import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/response";
import { companySettingsSchema } from "@/lib/validations/settings";

/** GET /api/v1/settings — company settings (boss). */
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireApiPermission(req, "SETTINGS_MANAGE");
    if (error) return error;

    const settings = await prisma.companySettings.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global", companyName: "molibso GmbH" },
    });
    const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

    return ok({ settings, holidays });
  } catch (err) {
    return serverError(err);
  }
}

/** PATCH /api/v1/settings — update company settings (boss). */
export async function PATCH(req: NextRequest) {
  try {
    const { user, error } = await requireApiPermission(req, "SETTINGS_MANAGE");
    if (error || !user) return error!;

    const body = await req.json();
    const parsed = companySettingsSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400, parsed.error.flatten());
    }

    const settings = await prisma.companySettings.upsert({
      where: { id: "global" },
      update: parsed.data,
      create: { id: "global", ...parsed.data },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "CompanySettings",
        entityId: "global",
      },
    });

    return ok(settings, { message: "Settings saved." });
  } catch (err) {
    return serverError(err);
  }
}
