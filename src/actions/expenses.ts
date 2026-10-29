"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { notifyAdminsOfExpenseClaim } from "@/lib/notifications";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { parseDateInput } from "@/lib/shift-period";
import { mealAllowanceCents, mileageCents } from "@/lib/expenses";
import type { ActionResult } from "./auth";

const RECEIPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

function revalidate() {
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

async function ownDraftClaim(claimId: string, employeeId: string) {
  const claim = await prisma.expenseClaim.findUnique({
    where: { id: claimId },
    include: { travelRequest: true },
  });
  if (!claim || claim.employeeId !== employeeId) return { ok: false as const, error: "Expense claim not found." };
  if (claim.status !== "DRAFT" && claim.status !== "REJECTED") {
    return { ok: false as const, error: "This claim can no longer be edited." };
  }
  if (claim.status === "REJECTED") {
    await prisma.expenseClaim.update({ where: { id: claim.id }, data: { status: "DRAFT", reviewComment: null } });
  }
  return { ok: true as const, claim };
}

function dayNumber(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function onTrip(spentOn: Date, start: Date, end: Date): boolean {
  const day = dayNumber(spentOn);
  return day >= dayNumber(start) && day <= dayNumber(end);
}

export async function createTravelRequest(input: {
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "No employee profile linked to this account." };

    const destination = input.destination.trim();
    const purpose = input.purpose.trim();
    const start = parseDateInput(input.startDate);
    const end = parseDateInput(input.endDate);
    if (!destination || !purpose) return { success: false, error: "Add a destination and a purpose." };
    if (!start || !end || end < start) return { success: false, error: "Choose a valid date range." };

    await prisma.travelRequest.create({
      data: {
        employeeId: session.user.employeeId,
        destination,
        purpose,
        startDate: start,
        endDate: end,
        status: "APPROVED",
        claim: { create: { employeeId: session.user.employeeId } },
      },
    });
    revalidate();
    return { success: true, message: "Trip added." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to submit the travel request" };
  }
}

export async function reviewTravelRequest(input: {
  id: string;
  status: "APPROVED" | "REJECTED";
  reviewComment?: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId || !hasPermission(session.user.role, "EXPENSE_APPROVE")) {
      return { success: false, error: "You don't have permission to review travel requests." };
    }

    const travel = await prisma.travelRequest.update({
      where: { id: input.id },
      data: {
        status: input.status,
        reviewComment: input.reviewComment?.trim() || null,
        reviewedAt: new Date(),
        reviewedById: session.user.employeeId,
      },
      include: { employee: true },
    });

    if (input.status === "APPROVED") {
      await prisma.expenseClaim.upsert({
        where: { travelRequestId: travel.id },
        update: {},
        create: { travelRequestId: travel.id, employeeId: travel.employeeId },
      });
    }

    await prisma.notification.create({
      data: {
        userId: travel.employee.userId,
        type: "SYSTEM",
        title: input.status === "APPROVED" ? "Travel request approved" : "Travel request rejected",
        message: `${travel.destination}: your trip was ${input.status.toLowerCase()}.`,
        link: "/expenses",
      },
    });

    revalidate();
    return { success: true, message: `Travel request ${input.status.toLowerCase()}.` };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to review the travel request" };
  }
}

export async function updateTravelRequest(input: {
  id: string;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "Not authenticated" };

    const destination = input.destination.trim();
    const purpose = input.purpose.trim();
    const start = parseDateInput(input.startDate);
    const end = parseDateInput(input.endDate);
    if (!destination || !purpose) return { success: false, error: "Add a destination and a purpose." };
    if (!start || !end || end < start) return { success: false, error: "Choose a valid date range." };

    const travel = await prisma.travelRequest.findUnique({
      where: { id: input.id },
      include: { claim: { include: { lines: true } } },
    });
    const boss = hasPermission(session.user.role, "EXPENSE_APPROVE");
    if (!travel || (travel.employeeId !== session.user.employeeId && !boss)) {
      return { success: false, error: "Trip not found." };
    }
    if (travel.claim && travel.claim.status !== "DRAFT" && travel.claim.status !== "REJECTED") {
      return { success: false, error: "This trip can no longer be edited." };
    }
    const outside = travel.claim?.lines.some((line) => !onTrip(line.spentOn, start, end)) ?? false;
    if (outside) return { success: false, error: "Some expenses fall outside these dates. Remove them first." };

    await prisma.travelRequest.update({
      where: { id: travel.id },
      data: { destination, purpose, startDate: start, endDate: end },
    });
    revalidate();
    return { success: true, message: "Trip updated." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update the trip" };
  }
}

export async function deleteTravelRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "Not authenticated" };
    const travel = await prisma.travelRequest.findUnique({
      where: { id },
      include: { claim: { include: { lines: true } } },
    });
    const boss = hasPermission(session.user.role, "EXPENSE_APPROVE");
    if (!travel || (travel.employeeId !== session.user.employeeId && !boss)) {
      return { success: false, error: "Trip not found." };
    }
    if (travel.claim?.status === "PENDING") {
      return { success: false, error: "A submitted claim cannot be deleted. Take it back first." };
    }
    if (travel.claim?.status === "APPROVED") {
      return { success: false, error: "An approved claim cannot be deleted." };
    }
    const receipts = travel.claim?.lines.map((line) => line.receiptPath).filter((file): file is string => Boolean(file)) ?? [];
    await prisma.travelRequest.delete({ where: { id } });
    await Promise.all(
      receipts.map((file) => unlink(path.join(process.cwd(), "data", "receipts", file)).catch(() => undefined)),
    );
    revalidate();
    return { success: true, message: "Trip deleted." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete the trip" };
  }
}

export async function addExpenseLine(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "Not authenticated" };

    const claimId = String(formData.get("claimId") ?? "");
    const owned = await ownDraftClaim(claimId, session.user.employeeId);
    if (!owned.ok) return { success: false, error: owned.error };

    const kind = String(formData.get("kind") ?? "");
    const spentOn = parseDateInput(String(formData.get("spentOn") ?? ""));
    if (!spentOn) return { success: false, error: "Choose the date of the expense." };
    if (!onTrip(spentOn, owned.claim.travelRequest.startDate, owned.claim.travelRequest.endDate)) {
      return { success: false, error: "The date has to fall within the trip." };
    }

    if (kind === "RECEIPT") {
      const description = String(formData.get("description") ?? "").trim();
      const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
      const file = formData.get("receipt");
      if (!description) return { success: false, error: "Describe the expense." };
      if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) return { success: false, error: "Enter an amount up to €10,000." };
      if (!(file instanceof File) || file.size === 0) return { success: false, error: "Add a photo of the receipt." };
      if (!RECEIPT_TYPES.has(file.type)) return { success: false, error: "Use a JPEG, PNG, or WebP photo." };
      if (file.size > MAX_RECEIPT_BYTES) return { success: false, error: "The photo must be under 8 MB." };

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const filename = `${crypto.randomUUID()}.${ext}`;
      const dir = path.join(process.cwd(), "data", "receipts");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

      await prisma.expenseLine.create({
        data: {
          claimId,
          kind: "RECEIPT",
          spentOn,
          description,
          amountCents: Math.round(amount * 100),
          receiptPath: filename,
        },
      });
    } else if (kind === "MILEAGE") {
      const kilometers = Number(String(formData.get("kilometers") ?? "").replace(",", "."));
      if (!Number.isFinite(kilometers) || kilometers <= 0 || kilometers > 5000) {
        return { success: false, error: "Enter the kilometres driven." };
      }
      await prisma.expenseLine.create({
        data: {
          claimId,
          kind: "MILEAGE",
          spentOn,
          description: `Private car, ${kilometers} km`,
          amountCents: mileageCents(kilometers),
          kilometers,
        },
      });
    } else if (kind === "MEAL") {
      const fullDay = formData.get("fullDay") === "1";
      const breakfast = formData.get("breakfast") === "1";
      const lunch = formData.get("lunch") === "1";
      const dinner = formData.get("dinner") === "1";
      const amountCents = mealAllowanceCents({ fullDay, breakfast, lunch, dinner });
      const provided = [
        breakfast ? "breakfast" : "",
        lunch ? "lunch" : "",
        dinner ? "dinner" : "",
      ].filter(Boolean);
      await prisma.expenseLine.create({
        data: {
          claimId,
          kind: "MEAL",
          spentOn,
          description: `${fullDay ? "24 hours" : "More than 8 hours"}${provided.length ? `, provided: ${provided.join(", ")}` : ""}`,
          amountCents,
          breakfastProvided: breakfast,
          lunchProvided: lunch,
          dinnerProvided: dinner,
        },
      });
    } else {
      return { success: false, error: "Choose a line type." };
    }

    revalidate();
    return { success: true, message: "Expense added." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to add the expense" };
  }
}

export async function deleteExpenseLine(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "Not authenticated" };
    const line = await prisma.expenseLine.findUnique({ where: { id }, include: { claim: true } });
    if (!line || line.claim.employeeId !== session.user.employeeId) return { success: false, error: "Expense not found." };
    if (line.claim.status !== "DRAFT" && line.claim.status !== "REJECTED") {
      return { success: false, error: "This claim can no longer be edited." };
    }
    await prisma.expenseLine.delete({ where: { id } });
    revalidate();
    return { success: true, message: "Expense removed." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to remove the expense" };
  }
}

export async function submitExpenseClaim(claimId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "Not authenticated" };
    const claim = await prisma.expenseClaim.findUnique({ where: { id: claimId }, include: { lines: true } });
    if (!claim || claim.employeeId !== session.user.employeeId) return { success: false, error: "Expense claim not found." };
    if (claim.status !== "DRAFT" && claim.status !== "REJECTED") return { success: false, error: "This claim was already submitted." };
    if (claim.lines.length === 0) return { success: false, error: "Add at least one expense first." };
    const submitted = await prisma.expenseClaim.update({
      where: { id: claimId },
      data: { status: "PENDING", submittedAt: new Date(), reviewComment: null },
      include: { employee: true, travelRequest: true },
    });
    await notifyAdminsOfExpenseClaim({
      employeeName: `${submitted.employee.firstName} ${submitted.employee.lastName}`,
      destination: submitted.travelRequest.destination,
    });
    revalidate();
    return { success: true, message: "Expense claim submitted." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to submit the claim" };
  }
}

export async function withdrawExpenseClaim(claimId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId) return { success: false, error: "Not authenticated" };
    const claim = await prisma.expenseClaim.findUnique({ where: { id: claimId } });
    if (!claim || claim.employeeId !== session.user.employeeId) return { success: false, error: "Expense claim not found." };
    if (claim.status !== "PENDING") return { success: false, error: "Only a submitted claim can be taken back." };
    await prisma.expenseClaim.update({
      where: { id: claimId },
      data: { status: "DRAFT", submittedAt: null, reviewComment: null },
    });
    revalidate();
    return { success: true, message: "Claim returned to draft." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to take the claim back" };
  }
}

export async function reviewExpenseClaim(input: {
  id: string;
  status: "APPROVED" | "REJECTED";
  reviewComment?: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user.employeeId || !hasPermission(session.user.role, "EXPENSE_APPROVE")) {
      return { success: false, error: "You don't have permission to review expense claims." };
    }
    const claim = await prisma.expenseClaim.update({
      where: { id: input.id },
      data: {
        status: input.status,
        reviewComment: input.reviewComment?.trim() || null,
        reviewedAt: new Date(),
        reviewedById: session.user.employeeId,
      },
      include: { employee: true, travelRequest: true },
    });
    await prisma.notification.create({
      data: {
        userId: claim.employee.userId,
        type: "SYSTEM",
        title: input.status === "APPROVED" ? "Expense claim approved" : "Expense claim rejected",
        message: `${claim.travelRequest.destination}: your expenses were ${input.status.toLowerCase()}.`,
        link: "/expenses",
      },
    });
    revalidate();
    return { success: true, message: `Expense claim ${input.status.toLowerCase()}.` };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to review the claim" };
  }
}
