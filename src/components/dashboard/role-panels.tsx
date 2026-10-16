"use client";

import { Role } from "@prisma/client";
import { useLocale } from "@/components/layout/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { isBoss } from "@/lib/rbac";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardCheck, Users, Settings, BarChart3 } from "lucide-react";

export function PendingActionsCard({
  pendingLeave,
  pendingCorrections,
}: {
  pendingLeave: number;
  pendingCorrections: number;
}) {
  const total = pendingLeave + pendingCorrections;
  const { t } = useLocale();
  if (total === 0) return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-warning" />
          {t("dashboard.pending")}
          <Badge variant="warning">{total}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {pendingLeave > 0 && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/leave">
              {t(pendingLeave === 1 ? "dashboard.leaveRequests" : "dashboard.leaveRequestsPlural", { count: pendingLeave })}
            </Link>
          </Button>
        )}
        {pendingCorrections > 0 && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/attendance">
              {t(pendingCorrections === 1 ? "dashboard.corrections" : "dashboard.correctionsPlural", {
                count: pendingCorrections,
              })}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminQuickLinks({ employeeCount }: { employeeCount: number }) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("dashboard.quickLinks")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/employees"
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-hover"
        >
          <Users className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">{employeeCount}</p>
            <p className="text-xs text-muted-foreground">{t("nav.team")}</p>
          </div>
        </Link>
        <Link
          href="/analytics"
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-hover"
        >
          <BarChart3 className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">{t("nav.analytics")}</p>
            <p className="text-xs text-muted-foreground">{t("analytics.title")}</p>
          </div>
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-hover"
        >
          <Settings className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">{t("nav.settings")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.holidays")}</p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

export function RoleCapabilitiesCard({ role, capabilities }: { role: Role; capabilities: string[] }) {
  const { t } = useLocale();
  if (!isBoss(role)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("dashboard.capabilities")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {capabilities.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {t(item as MessageKey)}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
