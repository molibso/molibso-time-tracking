import type { WhereInput } from "./types";

function isCompositeKey(key: string, where: WhereInput) {
  const value = where[key];
  return value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !("gte" in value) && !("lte" in value) && !("equals" in value) && !("in" in value) && !("not" in value);
}

function matchField(itemValue: unknown, filter: unknown): boolean {
  if (filter === undefined) return true;
  if (filter === null) return itemValue === null;
  if (filter instanceof Date) {
    return itemValue instanceof Date && itemValue.getTime() === filter.getTime();
  }
  if (typeof filter === "object" && filter !== null && !Array.isArray(filter)) {
    const f = filter as Record<string, unknown>;
    if ("equals" in f) return itemValue === f.equals;
    if ("in" in f && Array.isArray(f.in)) return f.in.includes(itemValue);
    if ("not" in f) return itemValue !== f.not;
    if ("gte" in f || "lte" in f) {
      const value = itemValue instanceof Date ? itemValue.getTime() : Number(itemValue);
      if ("gte" in f && f.gte instanceof Date && value < f.gte.getTime()) return false;
      if ("lte" in f && f.lte instanceof Date && value > f.lte.getTime()) return false;
      return true;
    }
    if (itemValue && typeof itemValue === "object") {
      return matchWhere(itemValue as Record<string, unknown>, f as WhereInput);
    }
    return false;
  }
  return itemValue === filter;
}

export function matchWhere<T extends Record<string, unknown>>(item: T, where?: WhereInput): boolean {
  if (!where) return true;

  for (const [key, filter] of Object.entries(where)) {
    if (key === "AND" && Array.isArray(filter)) {
      if (!filter.every((w) => matchWhere(item, w as WhereInput))) return false;
      continue;
    }
    if (key === "OR" && Array.isArray(filter)) {
      if (!filter.some((w) => matchWhere(item, w as WhereInput))) return false;
      continue;
    }
    if (key === "NOT" && filter && typeof filter === "object") {
      if (matchWhere(item, filter as WhereInput)) return false;
      continue;
    }

    if (isCompositeKey(key, where)) {
      const composite = where[key] as WhereInput;
      const related = item[key] as Record<string, unknown> | undefined;
      if (!related || !matchWhere(related, composite)) return false;
      continue;
    }

    if (!matchField(item[key], filter)) return false;
  }

  return true;
}

export function sortItems<T extends Record<string, unknown>>(items: T[], orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[]) {
  if (!orderBy) return items;
  const rules = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...items].sort((a, b) => {
    for (const rule of rules) {
      const [field, direction] = Object.entries(rule)[0] ?? [];
      if (!field) continue;
      const av = a[field];
      const bv = b[field];
      let cmp = 0;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
      else cmp = String(av).localeCompare(String(bv));
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

type IncludeSpec = Record<string, boolean | { include?: IncludeSpec; where?: WhereInput; take?: number; orderBy?: Record<string, "asc" | "desc"> }>;

export function applyInclude<T extends Record<string, unknown>>(
  item: T,
  include: IncludeSpec | undefined,
  relations: Record<string, () => unknown>,
): T {
  if (!include) return item;
  const result = { ...item } as Record<string, unknown>;

  for (const [key, spec] of Object.entries(include)) {
    if (!spec) continue;
    if (key === "_count") {
      const countSpec = spec as Record<string, { select?: Record<string, boolean> }>;
      const select = countSpec.select ?? {};
      result._count = Object.fromEntries(
        Object.keys(select).map((relation) => [relation, (relations[`_count.${relation}`]?.() as unknown[])?.length ?? 0]),
      );
      continue;
    }

    const getter = relations[key];
    if (!getter) continue;

    if (typeof spec === "object" && spec !== null && ("where" in spec || "take" in spec || "orderBy" in spec)) {
      let related = getter() as Record<string, unknown>[];
      if (spec.where) related = related.filter((r) => matchWhere(r, spec.where as WhereInput));
      if (spec.orderBy) related = sortItems(related, spec.orderBy);
      if (spec.take) related = related.slice(0, spec.take);
      if (spec.include) {
        result[key] = related.map((r) =>
          applyInclude(r, spec.include as IncludeSpec, buildRelationGetters(r, key)),
        );
      } else {
        result[key] = related.length === 1 && !Array.isArray(getter()) ? related[0] : related;
      }
    } else {
      const value = getter();
      if (Array.isArray(value) && (typeof spec === "object") && spec.include) {
        result[key] = value.map((r) => applyInclude(r as Record<string, unknown>, (spec as { include: IncludeSpec }).include, buildRelationGetters(r as Record<string, unknown>, key)));
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
}

function buildRelationGetters(item: Record<string, unknown>, parentModel: string): Record<string, () => unknown> {
  const { getStore } = require("./store") as typeof import("./store");
  const store = getStore();

  if (parentModel === "clockEntry") {
    return {
      breaks: () => store.breaks.filter((b) => b.clockEntryId === item.id),
    };
  }

  if (parentModel === "employee") {
    return {
      user: () => store.users.find((u) => u.id === item.userId),
      department: () => store.departments.find((d) => d.id === item.departmentId),
    };
  }

  if (parentModel === "attendance") {
    return {
      clockEntries: () =>
        store.clockEntries
          .filter((e) => e.attendanceId === item.id)
          .map((e) => applyInclude(e as unknown as Record<string, unknown>, { breaks: true }, buildRelationGetters(e as unknown as Record<string, unknown>, "clockEntry"))),
    };
  }

  return {};
}

export function clone<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)])) as T;
  }
  return value;
}
