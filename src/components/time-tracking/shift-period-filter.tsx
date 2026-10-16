"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  monthTitle,
  parseDateInput,
  recentMonths,
  recentWeeks,
  weekRangeLabel,
  type ShiftPeriod,
} from "@/lib/shift-period";
import { useLocale } from "@/components/layout/locale-provider";

const PERIODS: { id: ShiftPeriod; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "custom", label: "Custom" },
];

export function ShiftPeriodFilter({
  period,
  week,
  month,
  from,
  to,
}: {
  period: ShiftPeriod;
  week: string;
  month: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, t } = useLocale();

  const weeks = recentWeeks(new Date(), 26, locale);
  if (!weeks.some((item) => item.value === week)) {
    const weekStart = parseDateInput(week);
    if (weekStart) weeks.push({ value: week, label: weekRangeLabel(weekStart, locale) });
  }

  const months = recentMonths(new Date(), 18, locale);
  if (!months.some((item) => item.value === month)) {
    const [year, monthIndex] = month.split("-").map(Number);
    if (year && monthIndex) months.push({ value: month, label: monthTitle(new Date(year, monthIndex - 1, 1), locale) });
  }

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => update({ period: item.id })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === item.id ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(item.id === "week" ? "shifts.week" : item.id === "month" ? "shifts.month" : "shifts.custom")}
          </button>
        ))}
      </div>

      {period === "week" && (
        <Select value={week} onValueChange={(value) => update({ period: "week", week: value })}>
          <SelectTrigger className="h-10 w-[240px]" aria-label={t("shifts.week")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {period === "month" && (
        <Select value={month} onValueChange={(value) => update({ period: "month", month: value })}>
          <SelectTrigger className="h-10 w-[240px]" aria-label={t("shifts.month")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label={t("ph.from")}
            value={from}
            max={to}
            onChange={(event) => {
              if (event.target.value) update({ period: "custom", from: event.target.value, to });
            }}
            className="h-10 w-[160px]"
          />
          <span className="text-sm text-muted-foreground">{t("shifts.to")}</span>
          <Input
            type="date"
            aria-label={t("ph.to")}
            value={to}
            min={from}
            onChange={(event) => {
              if (event.target.value) update({ period: "custom", from, to: event.target.value });
            }}
            className="h-10 w-[160px]"
          />
        </div>
      )}
    </div>
  );
}
