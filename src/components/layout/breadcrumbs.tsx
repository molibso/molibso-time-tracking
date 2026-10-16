"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";
import { useCurrentPath } from "./navigation-pending";
import { useLocale } from "@/components/layout/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const LABELS: Record<string, MessageKey> = {
  dashboard: "nav.dashboard",
  "time-tracking": "nav.timeTracking",
  attendance: "nav.attendance",
  leave: "nav.leave",
  tasks: "nav.tasks",
  employees: "nav.employees",
  analytics: "nav.analytics",
  settings: "nav.settings",
  profile: "nav.profile",
  approvals: "nav.approvals",
};

export function Breadcrumbs() {
  const pathname = useCurrentPath();
  const { t } = useLocale();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/dashboard" className="flex items-center hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const label = LABELS[seg] ? t(LABELS[seg]) : seg;
        const isLast = i === segments.length - 1;
        return (
          <Fragment key={href}>
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground">
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
