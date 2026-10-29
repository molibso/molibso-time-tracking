import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

function cell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

type ClaimWithLines = {
  employee: { firstName: string; lastName: string };
  travelRequest: { destination: string; purpose: string; startDate: Date; endDate: Date };
  lines: { spentOn: Date; kind: string; description: string; amountCents: number; kilometers: number | null }[];
};

function toCsv(claims: ClaimWithLines[]): string {
  const header = [
    "Employee",
    "Destination",
    "Purpose",
    "Trip start",
    "Trip end",
    "Expense date",
    "Kind",
    "Description",
    "Amount EUR",
    "Kilometres",
  ];
  const rows = [header.join(",")];
  for (const claim of claims) {
    const person = `${claim.employee.firstName} ${claim.employee.lastName}`;
    for (const line of claim.lines) {
      rows.push(
        [
          person,
          claim.travelRequest.destination,
          claim.travelRequest.purpose,
          claim.travelRequest.startDate.toISOString().slice(0, 10),
          claim.travelRequest.endDate.toISOString().slice(0, 10),
          line.spentOn.toISOString().slice(0, 10),
          line.kind,
          line.description,
          (line.amountCents / 100).toFixed(2),
          line.kilometers ?? "",
        ]
          .map(cell)
          .join(","),
      );
    }
  }
  return rows.join("\n");
}

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user.employeeId) return new NextResponse("Forbidden", { status: 403 });

  const claimId = new URL(request.url).searchParams.get("claimId");
  const boss = hasPermission(session.user.role, "EXPENSE_APPROVE");

  if (claimId) {
    const claim = await prisma.expenseClaim.findUnique({
      where: { id: claimId },
      include: { employee: true, travelRequest: true, lines: { orderBy: { spentOn: "asc" } } },
    });
    if (!claim) return new NextResponse("Not found", { status: 404 });
    if (claim.employeeId !== session.user.employeeId && !boss) return new NextResponse("Forbidden", { status: 403 });
    const slug = claim.travelRequest.destination.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "claim";
    return csvResponse(toCsv([claim]), `expenses-${slug}.csv`);
  }

  if (!boss) return new NextResponse("Forbidden", { status: 403 });

  const claims = await prisma.expenseClaim.findMany({
    where: { status: "APPROVED" },
    include: { employee: true, travelRequest: true, lines: { orderBy: { spentOn: "asc" } } },
    orderBy: { reviewedAt: "desc" },
  });

  return csvResponse(toCsv(claims), "expenses.csv");
}
