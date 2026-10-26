import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";
import { RoleBadge } from "@/components/layout/role-badge";
import { ExpensesView, type ClaimQueueRow, type TravelQueueRow, type TripRow } from "@/components/expenses/expenses-view";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user.employeeId) redirect("/login");

  const employeeId = session.user.employeeId;
  const canApprove = hasPermission(session.user.role, "EXPENSE_APPROVE");
  const locale = await getLocale();

  const [trips, pendingTravel, pendingClaims] = await Promise.all([
    prisma.travelRequest.findMany({
      where: { employeeId },
      include: { claim: { include: { lines: { orderBy: { spentOn: "asc" } } } } },
      orderBy: { startDate: "desc" },
    }),
    canApprove
      ? prisma.travelRequest.findMany({
          where: { status: "PENDING" },
          include: { employee: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    canApprove
      ? prisma.expenseClaim.findMany({
          where: { status: "PENDING" },
          include: { employee: true, travelRequest: true, lines: true },
          orderBy: { submittedAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const tripRows: TripRow[] = trips.map((trip) => ({
    id: trip.id,
    destination: trip.destination,
    purpose: trip.purpose,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    status: trip.status,
    reviewComment: trip.reviewComment,
    claim: trip.claim
      ? {
          id: trip.claim.id,
          status: trip.claim.status,
          reviewComment: trip.claim.reviewComment,
          lines: trip.claim.lines.map((line) => ({
            id: line.id,
            kind: line.kind,
            spentOn: line.spentOn.toISOString(),
            description: line.description,
            amountCents: line.amountCents,
            hasReceipt: Boolean(line.receiptPath),
          })),
        }
      : null,
  }));

  const travelQueue: TravelQueueRow[] = pendingTravel.map((trip) => ({
    id: trip.id,
    employeeName: `${trip.employee.firstName} ${trip.employee.lastName}`,
    destination: trip.destination,
    purpose: trip.purpose,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
  }));

  const claimQueue: ClaimQueueRow[] = pendingClaims.map((claim) => ({
    id: claim.id,
    employeeName: `${claim.employee.firstName} ${claim.employee.lastName}`,
    destination: claim.travelRequest.destination,
    purpose: claim.travelRequest.purpose,
    totalCents: claim.lines.reduce((sum, line) => sum + line.amountCents, 0),
    lines: claim.lines.map((line) => ({
      id: line.id,
      kind: line.kind,
      description: line.description,
      amountCents: line.amountCents,
      hasReceipt: Boolean(line.receiptPath),
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "expenses.title")}</h1>
            <RoleBadge role={session.user.role} />
          </div>
          <p className="text-sm text-muted-foreground">
            {translate(locale, canApprove ? "expenses.subtitleBoss" : "expenses.subtitle")}
          </p>
        </div>
        {canApprove && (
          <a
            href="/api/expenses/export"
            className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            {translate(locale, "expenses.export")}
          </a>
        )}
      </div>
      <ExpensesView canApprove={canApprove} trips={tripRows} travelQueue={travelQueue} claimQueue={claimQueue} />
    </div>
  );
}
