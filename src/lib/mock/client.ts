import type { PrismaClient } from "@prisma/client";
import { applyInclude, clone, matchWhere, sortItems } from "./query";
import { MODEL_DEFAULTS } from "./defaults";
import { getStore, nextId, now } from "./store";
import type { IncludeSpec, Store, WhereInput } from "./types";

type FindArgs = { where?: WhereInput; include?: IncludeSpec; orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[]; take?: number };
type CreateArgs<T> = { data: Partial<T> & Record<string, unknown> };
type UpdateArgs<T> = { where: WhereInput; data: Partial<T> & Record<string, unknown>; include?: IncludeSpec };
type UpsertArgs<T> = { where: WhereInput; create: Partial<T> & Record<string, unknown>; update: Partial<T> & Record<string, unknown> };

function expandCompositeWhere(where: WhereInput): WhereInput {
  const expanded: WhereInput = { ...where };
  for (const [key, value] of Object.entries(where)) {
    if (key.includes("_") && value && typeof value === "object" && !(value instanceof Date) && !Array.isArray(value) && !("gte" in value)) {
      Object.assign(expanded, value as WhereInput);
      delete expanded[key];
    }
  }
  return expanded;
}

function findUniqueWhere<T extends Record<string, unknown>>(items: T[], where: WhereInput): T | undefined {
  return items.find((item) => matchWhere(item, expandCompositeWhere(where)));
}

function createModelDelegate<K extends keyof Store>(modelKey: K, prefix: string) {
  return {
    async findUnique({ where, include }: FindArgs) {
      const store = getStore();
      const items = store[modelKey] as Record<string, unknown>[];
      const item = findUniqueWhere(items, where ?? {});
      if (!item) return null;
      return applyInclude(clone(item), include, buildRelations(modelKey, item));
    },

    async findFirst({ where, include, orderBy }: FindArgs) {
      const store = getStore();
      let items = (store[modelKey] as Record<string, unknown>[]).filter((item) => matchWhere(item, where ?? {}));
      items = sortItems(items, orderBy);
      const item = items[0];
      if (!item) return null;
      return applyInclude(clone(item), include, buildRelations(modelKey, item));
    },

    async findMany({ where, include, orderBy, take }: FindArgs = {}) {
      const store = getStore();
      let items = (store[modelKey] as Record<string, unknown>[]).filter((item) => matchWhere(item, where ?? {}));
      items = sortItems(items, orderBy);
      if (take) items = items.slice(0, take);
      return items.map((item) => applyInclude(clone(item), include, buildRelations(modelKey, item)));
    },

    async create({ data, include }: CreateArgs<Store[K][number]> & { include?: IncludeSpec }) {
      const store = getStore();
      const timestamp = now();
      const defaults = MODEL_DEFAULTS[modelKey] ?? {};
      const record = {
        id: nextId(prefix),
        createdAt: timestamp,
        updatedAt: timestamp,
        ...defaults,
        ...data,
      } as Store[K][number];
      (store[modelKey] as unknown as Store[K][number][]).push(record);
      return applyInclude(clone(record as unknown as Record<string, unknown>), include, buildRelations(modelKey, record as unknown as Record<string, unknown>));
    },

    async update({ where, data, include }: UpdateArgs<Store[K][number]>) {
      const store = getStore();
      const items = store[modelKey] as Record<string, unknown>[];
      const index = items.findIndex((item) => matchWhere(item, where));
      if (index === -1) throw new Error(`Record not found in ${String(modelKey)}`);
      const updated = { ...items[index], ...data, updatedAt: now() };
      items[index] = updated;
      return applyInclude(clone(updated), include, buildRelations(modelKey, updated));
    },

    async upsert({ where, create, update }: UpsertArgs<Store[K][number]>) {
      const existing = await this.findUnique({ where });
      if (existing) {
        return this.update({ where, data: update });
      }
      return this.create({ data: create });
    },

    async delete({ where }: { where: WhereInput }) {
      const store = getStore();
      const items = store[modelKey] as Record<string, unknown>[];
      const index = items.findIndex((item) => matchWhere(item, where));
      if (index === -1) throw new Error(`Record not found in ${String(modelKey)}`);
      const [removed] = items.splice(index, 1);
      return clone(removed);
    },

    async count({ where }: { where?: WhereInput } = {}) {
      const store = getStore();
      return (store[modelKey] as Record<string, unknown>[]).filter((item) => matchWhere(item, where ?? {})).length;
    },

    async aggregate({ where, _sum }: { where?: WhereInput; _sum?: Record<string, boolean> }) {
      const store = getStore();
      const items = (store[modelKey] as Record<string, unknown>[]).filter((item) => matchWhere(item, where ?? {}));
      const sum: Record<string, number | null> = {};
      if (_sum) {
        for (const field of Object.keys(_sum)) {
          sum[field] = items.reduce((acc, item) => acc + Number(item[field] ?? 0), 0);
        }
      }
      return { _sum: sum };
    },

    async groupBy({ by, where, _sum }: { by: string[]; where?: WhereInput; _sum?: Record<string, boolean> }) {
      const store = getStore();
      const items = (store[modelKey] as Record<string, unknown>[]).filter((item) => matchWhere(item, where ?? {}));
      const groups = new Map<string, Record<string, unknown>[]>();

      for (const item of items) {
        const key = by.map((field) => String(item[field])).join("::");
        const group = groups.get(key) ?? [];
        group.push(item);
        groups.set(key, group);
      }

      return Array.from(groups.values()).map((group) => {
        const result: Record<string, unknown> = {};
        for (const field of by) result[field] = group[0][field];
        if (_sum) {
          result._sum = Object.fromEntries(
            Object.keys(_sum).map((field) => [field, group.reduce((acc, item) => acc + Number(item[field] ?? 0), 0)]),
          );
        }
        return result;
      });
    },

    async createMany({ data, skipDuplicates }: { data: Array<Partial<Store[K][number]> & Record<string, unknown>>; skipDuplicates?: boolean }) {
      let count = 0;
      for (const row of data) {
        try {
          await this.create({ data: row });
          count += 1;
        } catch {
          if (!skipDuplicates) throw new Error("createMany failed");
        }
      }
      return { count };
    },

    async updateMany({ where, data }: { where?: WhereInput; data: Record<string, unknown> }) {
      const store = getStore();
      const items = store[modelKey] as Record<string, unknown>[];
      let count = 0;
      for (let i = 0; i < items.length; i++) {
        if (matchWhere(items[i], where ?? {})) {
          items[i] = { ...items[i], ...data, updatedAt: now() };
          count += 1;
        }
      }
      return { count };
    },
  };
}

function buildRelations<K extends keyof Store>(modelKey: K, item: Record<string, unknown>): Record<string, () => unknown> {
  const store = getStore();

  switch (modelKey) {
    case "users":
      return {
        employee: () => store.employees.find((e) => e.userId === item.id),
      };
    case "employees":
      return {
        user: () => store.users.find((u) => u.id === item.userId),
        department: () => store.departments.find((d) => d.id === item.departmentId),
        clockEntries: () =>
          store.clockEntries
            .filter((e) => e.employeeId === item.id)
            .map((e) =>
              applyInclude(e as unknown as Record<string, unknown>, { breaks: true }, {
                breaks: () => store.breaks.filter((b) => b.clockEntryId === e.id),
              }),
            ),
        attendances: () => store.attendances.filter((a) => a.employeeId === item.id),
      };
    case "departments":
      return {
        "_count.employees": () => store.employees.filter((e) => e.departmentId === item.id),
      };
    case "attendances":
      return {
        clockEntries: () =>
          store.clockEntries
            .filter((e) => e.attendanceId === item.id)
            .map((e) =>
              applyInclude(e as unknown as Record<string, unknown>, { breaks: true }, {
                breaks: () => store.breaks.filter((b) => b.clockEntryId === e.id),
              }),
            ),
      };
    case "clockEntries":
      return {
        breaks: () => store.breaks.filter((b) => b.clockEntryId === item.id),
      };
    case "leaveRequests":
      return {
        employee: () => {
          const employee = store.employees.find((e) => e.id === item.employeeId);
          if (!employee) return null;
          return applyInclude(employee as unknown as Record<string, unknown>, { user: true }, {
            user: () => store.users.find((u) => u.id === employee.userId),
          });
        },
      };
    case "correctionRequests":
      return {
        employee: () => store.employees.find((e) => e.id === item.employeeId),
        attendance: () => store.attendances.find((a) => a.id === item.attendanceId),
      };
    default:
      return {};
  }
}

export function createMockPrismaClient(): PrismaClient {
  const client = {
    user: createModelDelegate("users", "usr"),
    employee: createModelDelegate("employees", "emp"),
    department: createModelDelegate("departments", "dep"),
    clockEntry: createModelDelegate("clockEntries", "clk"),
    break: createModelDelegate("breaks", "brk"),
    attendance: createModelDelegate("attendances", "att"),
    leaveRequest: createModelDelegate("leaveRequests", "lve"),
    correctionRequest: createModelDelegate("correctionRequests", "cor"),
    notification: createModelDelegate("notifications", "ntf"),
    companySettings: createModelDelegate("companySettings", "cfg"),
    holiday: createModelDelegate("holidays", "hol"),
    shift: createModelDelegate("shifts", "shf"),
    passwordResetToken: createModelDelegate("passwordResetTokens", "rst"),
    auditLog: createModelDelegate("auditLogs", "aud"),
    async $transaction(arg: unknown) {
      if (typeof arg === "function") {
        return arg(client);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      throw new Error("Unsupported transaction shape");
    },
    async $disconnect() {},
  };

  return client as unknown as PrismaClient;
}
