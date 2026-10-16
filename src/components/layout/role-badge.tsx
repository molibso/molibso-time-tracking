"use client";

import type { Role } from "@prisma/client";
import { getRoleView } from "@/lib/role-views";
import { effectiveRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/layout/locale-provider";

export function RoleBadge({ role }: { role: Role }) {
  const view = getRoleView(role);
  const { t } = useLocale();
  return <Badge variant={view.badgeVariant}>{t(effectiveRole(role) === "ADMIN" ? "role.boss" : "role.employee")}</Badge>;
}
