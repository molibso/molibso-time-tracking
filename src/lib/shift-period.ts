import { endOfDay, startOfDay, startOfMonth, startOfWeek } from "@/lib/utils";
import { intlLocale, translate, type Locale } from "@/lib/i18n/messages";

export type ShiftPeriod = "week" | "month" | "custom";

export type ResolvedShiftRange = {
  period: ShiftPeriod;
  from: Date;
  to: Date;
  week: string;
  month: string;
  fromInput: string;
  toInput: string;
};

export function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function weekRangeLabel(weekStart: Date, locale: Locale = "en"): string {
  const tag = intlLocale(locale);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startText = weekStart.toLocaleDateString(tag, { month: "short", day: "numeric" });
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth() && weekStart.getFullYear() === weekEnd.getFullYear();
  const endText = weekEnd.toLocaleDateString(tag, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startText} – ${endText}`;
}

export function weekTitle(weekStart: Date, now = new Date(), locale: Locale = "en"): string {
  const range = weekRangeLabel(weekStart, locale);
  const current = startOfWeek(now).getTime();
  const previous = new Date(current);
  previous.setDate(previous.getDate() - 7);
  if (weekStart.getTime() === current) return `${translate(locale, "shifts.thisWeek")} · ${range}`;
  if (weekStart.getTime() === previous.getTime()) return `${translate(locale, "shifts.lastWeek")} · ${range}`;
  return translate(locale, "shifts.weekOf", { range });
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthTitle(date: Date, locale: Locale = "en"): string {
  return date.toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric" });
}

export function recentWeeks(now = new Date(), count = 26, locale: Locale = "en"): { value: string; label: string }[] {
  const start = startOfWeek(now);
  return Array.from({ length: count }, (_, index) => {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - index * 7);
    const value = toDateInput(weekStart);
    const range = weekRangeLabel(weekStart, locale);
    const label =
      index === 0
        ? `${translate(locale, "shifts.thisWeek")} · ${range}`
        : index === 1
          ? `${translate(locale, "shifts.lastWeek")} · ${range}`
          : range;
    return { value, label };
  });
}

export function recentMonths(now = new Date(), count = 18, locale: Locale = "en"): { value: string; label: string }[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const name = monthTitle(date, locale);
    return {
      value: monthKey(date),
      label: index === 0 ? `${translate(locale, "shifts.thisMonth")} · ${name}` : name,
    };
  });
}

function endOfWeek(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

function endOfMonth(monthStart: Date): Date {
  return endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
}

export function resolveShiftRange(
  input: { period?: string; week?: string; month?: string; from?: string; to?: string },
  now = new Date(),
): ResolvedShiftRange {
  const period: ShiftPeriod = input.period === "month" || input.period === "custom" ? input.period : "week";
  const thisWeek = startOfWeek(now);
  const thisMonth = startOfMonth(now);

  const weekStart = startOfWeek(input.week ? parseDateInput(input.week) ?? now : now);
  const week = toDateInput(weekStart);

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(input.month ?? "");
  let monthStart = thisMonth;
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const monthIndex = Number(monthMatch[2]) - 1;
    if (monthIndex >= 0 && monthIndex <= 11) monthStart = new Date(year, monthIndex, 1);
  }
  const month = monthKey(monthStart);

  let customFrom = input.from ? parseDateInput(input.from) : null;
  let customTo = input.to ? parseDateInput(input.to) : null;
  if (!customFrom || !customTo) {
    customFrom = thisMonth;
    customTo = startOfDay(now);
  }
  if (customFrom > customTo) {
    const swap = customFrom;
    customFrom = customTo;
    customTo = swap;
  }

  const fromInput = toDateInput(customFrom);
  const toInput = toDateInput(customTo);

  if (period === "month") {
    return { period, from: monthStart, to: endOfMonth(monthStart), week, month, fromInput, toInput };
  }
  if (period === "custom") {
    return { period, from: startOfDay(customFrom), to: endOfDay(customTo), week, month, fromInput, toInput };
  }
  return { period: "week", from: weekStart, to: endOfWeek(weekStart), week, month, fromInput, toInput };
}

export function emptyShiftCopy(period: ShiftPeriod, isSelf: boolean, locale: Locale = "en"): string {
  if (period === "week") return translate(locale, isSelf ? "shifts.noneWeekSelf" : "shifts.noneWeek");
  if (period === "month") return translate(locale, "shifts.noneMonth");
  return translate(locale, "shifts.noneRange");
}
