import type { PrismaClient } from "@prisma/client";
import { resetStore } from "@/lib/mock/store";

/** Offline mock bootstrap — company settings only (no demo users). */
export async function seedMockDatabase(prisma: PrismaClient) {
  resetStore();

  await prisma.companySettings.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", companyName: "molibso GmbH" },
  });
}
