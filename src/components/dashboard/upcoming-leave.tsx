"use client";

import { CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateRange } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";
import { leaveKindKey } from "@/lib/i18n/labels";

export interface UpcomingLeaveItem {
  id: string;
  employeeName: string;
  type: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
}

export function UpcomingLeave({ items, showName = true }: { items: UpcomingLeaveItem[]; showName?: boolean }) {
  const { locale, t } = useLocale();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <CalendarRange className="h-6 w-6" />
        <p className="text-sm">{t("dashboard.noUpcomingLeave")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const kind = leaveKindKey(item.type);
        const days =
          item.totalDays === 1
            ? t("leave.dayCount", { count: item.totalDays })
            : t("leave.dayCountPlural", { count: item.totalDays });
        return (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <div className="min-w-0">
              {showName && <p className="text-sm font-medium">{item.employeeName}</p>}
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatDateRange(item.startDate, item.endDate, locale)} · {days}
              </p>
            </div>
            <Badge variant="outline">{kind ? t(kind) : item.type}</Badge>
          </div>
        );
      })}
    </div>
  );
}
