import type { Role } from "@prisma/client";
import { getRoleView } from "@/lib/role-views";
import { Badge } from "@/components/ui/badge";

export function RoleBadge({ role }: { role: Role }) {
  const view = getRoleView(role);
  return <Badge variant={view.badgeVariant}>{view.label}</Badge>;
}
