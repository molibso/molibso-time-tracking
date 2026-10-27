import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";
import { RoleBadge } from "@/components/layout/role-badge";
import { ExpensesView, type ClaimQueueRow, type TripRow } from "@/components/expenses/expenses-view";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user.employeeId) redirect("/login");

  const employeeId = session.user.employeeId;
  const canApprove = hasPermission(session.user.role, "EXPENSE_APPROVE");
  const locale = await getLocale();

  const tripInclude = {
    employee: { select: { firstName: true, lastName: true } },
    claim: { include: { lines: { orderBy: { spentOn: "asc" as const } } } },
  };

  const [trips, history, pendingClaims] = await Promise.all([
    prisma.travelRequest.findMany({
      where: { employeeId },
      include: tripInclude,
      orderBy: { startDate: "desc" },
    }),
    canApprove
      ? prisma.travelRequest.findMany({
          where: { status: { not: "CANCELLED" } },
          include: tripInclude,
          orderBy: { startDate: "desc" },
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

  function toTripRow(trip: (typeof trips)[number], withName: boolean): TripRow {
    return {
      id: trip.id,
      employeeName: withName ? `${trip.employee.firstName} ${trip.employee.lastName}` : null,
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
    };
  }

  const tripRows: TripRow[] = trips.map((trip) => toTripRow(trip, false));
  const historyRows: TripRow[] = history.map((trip) => toTripRow(trip, true));

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
      <ExpensesView canApprove={canApprove} trips={tripRows} history={historyRows} claimQueue={claimQueue} />
    </div>
  );
}
