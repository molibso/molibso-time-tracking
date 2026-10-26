import { endOfDay, startOfDay, startOfWeek } from "@/lib/utils";
import { parseDateInput, toDateInput } from "@/lib/shift-period";

export type ChartSpan = "7d" | "this" | "last" | "custom";

export type WorkedChartPoint = {
  day: string;
  seconds: number;
  hours: number;
  future: boolean;
};

export type ChartRange = {
  span: ChartSpan;
  from: Date;
  to: Date;
  customFrom: string;
  customTo: string;
};

const MAX_CUSTOM_DAYS = 42;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday–Friday of the week that contains `date`. */
function workweek(date: Date): { from: Date; to: Date } {
  const from = startOfWeek(date);
  return { from, to: addDays(from, 4) };
}

export function resolveChartRange(
  input: { chart?: string; from?: string; to?: string },
  now = new Date(),
): ChartRange {
  const span: ChartSpan =
    input.chart === "this" || input.chart === "last" || input.chart === "custom" ? input.chart : "7d";
  const today = startOfDay(now);

  let customFrom = input.from ? parseDateInput(input.from) : null;
  let customTo = input.to ? parseDateInput(input.to) : null;
  if (!customFrom || !customTo) {
    customFrom = addDays(today, -6);
    customTo = today;
  }
  if (customFrom > customTo) {
    const swap = customFrom;
    customFrom = customTo;
    customTo = swap;
  }
  if (addDays(customFrom, MAX_CUSTOM_DAYS - 1) < customTo) {
    customTo = addDays(customFrom, MAX_CUSTOM_DAYS - 1);
  }

  let from = addDays(today, -6);
  let to = today;
  if (span === "this") {
    const week = workweek(today);
    from = week.from;
    to = week.to;
  } else if (span === "last") {
    const week = workweek(addDays(today, -7));
    from = week.from;
    to = week.to;
  } else if (span === "custom") {
    from = customFrom;
    to = customTo;
  }

  return {
    span,
    from: startOfDay(from),
    to: endOfDay(to),
    customFrom: toDateInput(customFrom),
    customTo: toDateInput(customTo),
  };
}
