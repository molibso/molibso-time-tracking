"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocale } from "@/components/layout/locale-provider";
import { initials, cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n/messages";
import type { ClockStatus } from "@/types/clock";

const STATUS_KEY: Record<ClockStatus, MessageKey> = {
  WORKING: "clock.working",
  ON_BREAK: "clock.onBreak",
  OFFLINE: "clock.offline",
};
const STATUS_DOT: Record<ClockStatus, string> = {
  WORKING: "bg-success",
  ON_BREAK: "bg-warning",
  OFFLINE: "bg-muted-foreground",
};

export function TeamAvailability({
  members,
}: {
  members: { id: string; name: string; position: string; status: ClockStatus; overtime?: boolean }[];
}) {
  const { t } = useLocale();
  if (members.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.teamEmpty")}</p>;
  }

  return (
    <div className="space-y-1">
      {members.map((m) => {
        const [first, ...rest] = m.name.split(" ");
        return (
          <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover">
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(first, rest.join(" ") || first)}</AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full status-dot",
                  STATUS_DOT[m.status],
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.position}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t(STATUS_KEY[m.status])}</p>
              {m.overtime && <p className="text-xs font-medium text-warning">{t("dashboard.overtimeNow")}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
