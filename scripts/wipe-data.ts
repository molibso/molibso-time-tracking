/**
 * Deletes all application data from Supabase (keeps schema / migrations).
 * Run: npx tsx scripts/wipe-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping application data...");

  await prisma.$transaction([
    prisma.break.deleteMany(),
    prisma.clockEntry.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.correctionRequest.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.task.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.holiday.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.user.deleteMany(),
    prisma.department.deleteMany(),
  ]);

  await prisma.companySettings.upsert({
    where: { id: "global" },
    update: { companyName: "molibso GmbH" },
    create: { id: "global", companyName: "molibso GmbH" },
  });

  console.log("Done. Database is empty (company settings kept).");
  console.log("Next: POST /api/v1/auth/bootstrap to create the first admin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
