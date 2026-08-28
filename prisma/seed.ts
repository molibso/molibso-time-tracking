import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Ensures company settings exist. Does not create demo users. */
async function main() {
  await prisma.companySettings.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", companyName: "molibso GmbH" },
  });
  console.log("Seed complete (company settings only — no demo users).");
  console.log("Create the first admin via POST /api/v1/auth/bootstrap");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
