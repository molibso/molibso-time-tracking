import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

function cell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const session = await auth();
  if (!session?.user.employeeId || !hasPermission(session.user.role, "EXPENSE_APPROVE")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const claims = await prisma.expenseClaim.findMany({
    where: { status: "APPROVED" },
    include: { employee: true, travelRequest: true, lines: { orderBy: { spentOn: "asc" } } },
    orderBy: { reviewedAt: "desc" },
  });

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

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"expenses.csv\"",
    },
  });
}
