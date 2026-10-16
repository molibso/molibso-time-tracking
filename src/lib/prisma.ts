/**
 * Prisma client — local PostgreSQL by default.
 * Set USE_MOCK_DATA=true only for offline demos without a database.
 *
 * Important: always reuse one client in dev (Next.js HMR). Creating a new
 * PrismaClient per reload can exhaust database connection slots.
 */
import { PrismaClient } from "@prisma/client";

const useMockData = process.env.USE_MOCK_DATA === "true";

const POOL_REVISION = 2;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPoolRevision?: number;
  mockSeeded?: boolean;
  mockClientPromise?: Promise<PrismaClient>;
};

/** Prefer a small pool so one page can run several queries without serializing hard. */
function pooledDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  return url.replace(/([?&]connection_limit=)1\b/, (_, prefix: string) => `${prefix}10`);
}

function createPostgresClient(): PrismaClient {
  const url = pooledDatabaseUrl();
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
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
  if (!globalForPrisma.prisma || globalForPrisma.prismaPoolRevision !== POOL_REVISION) {
    void globalForPrisma.prisma?.$disconnect();
    globalForPrisma.prisma = createPostgresClient();
    globalForPrisma.prismaPoolRevision = POOL_REVISION;
  }
  return globalForPrisma.prisma;
}

export const prisma = useMockData ? withLazyClient(resolveMockClient) : getPostgresClient();

export { useMockData };
