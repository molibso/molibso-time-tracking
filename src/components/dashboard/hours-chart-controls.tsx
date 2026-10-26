"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChartSpan } from "@/lib/chart-range";
import { useLocale } from "@/components/layout/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const SPANS: { id: ChartSpan; label: MessageKey }[] = [
  { id: "7d", label: "dashboard.chart.last7" },
  { id: "this", label: "dashboard.chart.thisWeek" },
  { id: "last", label: "dashboard.chart.lastWeek" },
  { id: "custom", label: "dashboard.chart.custom" },
];

export function HoursChartControls({
  span,
  from,
  to,
}: {
  span: ChartSpan;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
        {SPANS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => update(item.id === "custom" ? { chart: "custom", from, to } : { chart: item.id })}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              span === item.id ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      {span === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label={t("ph.from")}
            value={from}
            max={to}
            onChange={(event) => {
              if (event.target.value) update({ chart: "custom", from: event.target.value, to });
            }}
            className="h-9 w-[150px]"
          />
          <span className="text-sm text-muted-foreground">{t("shifts.to")}</span>
          <Input
            type="date"
            aria-label={t("ph.to")}
            value={to}
            min={from}
            onChange={(event) => {
              if (event.target.value) update({ chart: "custom", from, to: event.target.value });
            }}
            className="h-9 w-[150px]"
          />
        </div>
      )}
    </div>
  );
}
