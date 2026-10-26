-- Travel requests and the expense claims that follow them.

CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "ExpenseLineKind" AS ENUM ('RECEIPT', 'MILEAGE', 'MEAL');

CREATE TABLE "TravelRequest" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
  "reviewComment" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpenseClaim" (
  "id" TEXT NOT NULL,
  "travelRequestId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
  "reviewComment" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpenseLine" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "kind" "ExpenseLineKind" NOT NULL,
  "spentOn" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "receiptPath" TEXT,
  "kilometers" DOUBLE PRECISION,
  "breakfastProvided" BOOLEAN NOT NULL DEFAULT false,
  "lunchProvided" BOOLEAN NOT NULL DEFAULT false,
  "dinnerProvided" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpenseLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseClaim_travelRequestId_key" ON "ExpenseClaim"("travelRequestId");
CREATE INDEX "TravelRequest_employeeId_idx" ON "TravelRequest"("employeeId");
CREATE INDEX "TravelRequest_status_idx" ON "TravelRequest"("status");
CREATE INDEX "ExpenseClaim_employeeId_idx" ON "ExpenseClaim"("employeeId");
CREATE INDEX "ExpenseClaim_status_idx" ON "ExpenseClaim"("status");
CREATE INDEX "ExpenseLine_claimId_idx" ON "ExpenseLine"("claimId");

ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_travelRequestId_fkey" FOREIGN KEY ("travelRequestId") REFERENCES "TravelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenseLine" ADD CONSTRAINT "ExpenseLine_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ExpenseClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
