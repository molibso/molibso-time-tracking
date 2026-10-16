-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "notifyOvertimeAlert" BOOLEAN NOT NULL DEFAULT true;
