import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  PlaneTakeoff,
  BarChart3,
  Settings,
  CheckSquare,
  CalendarClock,
  Receipt,
} from "lucide-react";
import { effectiveRole } from "@/lib/rbac";
import type { MessageKey } from "@/lib/i18n/messages";

export interface NavItem {
  labelKey: MessageKey;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.timeTracking", href: "/time-tracking", icon: Clock },
  { labelKey: "nav.attendance", href: "/attendance", icon: CalendarDays },
  { labelKey: "nav.leave", href: "/leave", icon: PlaneTakeoff },
  { labelKey: "nav.tasks", href: "/tasks", icon: CheckSquare },
  { labelKey: "nav.rooms", href: "/rooms", icon: CalendarClock },
  { labelKey: "nav.expenses", href: "/expenses", icon: Receipt },
  { labelKey: "nav.team", href: "/employees", icon: Users, roles: ["ADMIN"] },
  { labelKey: "nav.analytics", href: "/analytics", icon: BarChart3, roles: ["ADMIN"] },
  { labelKey: "nav.settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

export function visibleNavItems(role: Role): NavItem[] {
  const effective = effectiveRole(role);
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(effective));
}
