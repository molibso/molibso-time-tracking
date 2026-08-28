/**
 * Prisma client — PostgreSQL (Supabase) by default.
 * Set USE_MOCK_DATA=true only for offline demos without a database.
 *
 * Important: always reuse one client in dev (Next.js HMR). Creating a new
 * PrismaClient per reload exhausts Supabase pooler connections (EMAXCONN).
 */
import { PrismaClient } from "@prisma/client";

const useMockData = process.env.USE_MOCK_DATA === "true";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  mockSeeded?: boolean;
  mockClientPromise?: Promise<PrismaClient>;
};

function createPostgresClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

async function createMockClient(): Promise<PrismaClient> {
  const { createMockPrismaClient } = await import("@/lib/mock/client");
  const { seedMockDatabase } = await import("@/lib/mock-seed");
  const client = createMockPrismaClient();
  if (!globalForPrisma.mockSeeded) {
    await seedMockDatabase(client);
    globalForPrisma.mockSeeded = true;
  }
  return client;
}

async function resolveMockClient(): Promise<PrismaClient> {
  if (!globalForPrisma.mockClientPromise) {
    globalForPrisma.mockClientPromise = createMockClient();
  }
  return globalForPrisma.mockClientPromise;
}

function withLazyClient(getClient: () => Promise<PrismaClient>): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === "then") return undefined;
      if (prop === "$transaction") {
        return async (...args: unknown[]) => {
          const client = await getClient();
          return (client.$transaction as (...a: unknown[]) => unknown).apply(client, args);
        };
      }
      if (prop === "$connect" || prop === "$disconnect" || prop === "$queryRaw") {
        return async (...args: unknown[]) => {
          const client = await getClient();
          const method = (client as unknown as Record<string | symbol, unknown>)[prop];
          if (typeof method !== "function") throw new Error(`Unknown Prisma method: ${String(prop)}`);
          return method.apply(client, args);
        };
      }
      return new Proxy(
        {},
        {
          get(_modelTarget, modelProp) {
            return async (...args: unknown[]) => {
              const client = await getClient();
              const model = (client as unknown as Record<string | symbol, unknown>)[prop];
              if (!model || typeof model !== "object") {
                throw new Error(`Unknown Prisma model: ${String(prop)}`);
              }
              const method = (model as Record<string | symbol, unknown>)[modelProp];
              if (typeof method !== "function") {
                throw new Error(`Unknown Prisma method: ${String(prop)}.${String(modelProp)}`);
              }
              return method.apply(model, args);
            };
          },
        },
      );
    },
  });
}

function getPostgresClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPostgresClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = useMockData ? withLazyClient(resolveMockClient) : getPostgresClient();

export { useMockData };
