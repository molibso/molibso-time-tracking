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
} from "lucide-react";
import { effectiveRole } from "@/lib/rbac";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Time Tracking", href: "/time-tracking", icon: Clock },
  { label: "Attendance", href: "/attendance", icon: CalendarDays },
  { label: "Leave", href: "/leave", icon: PlaneTakeoff },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Team", href: "/employees", icon: Users, roles: ["ADMIN"] },
  { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["ADMIN"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

export function visibleNavItems(role: Role): NavItem[] {
  const effective = effectiveRole(role);
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(effective));
}
