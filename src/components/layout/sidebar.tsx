"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { visibleNavItems } from "./nav-config";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = visibleNavItems(role);

  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-border/80 bg-surface lg:flex lg:flex-col">
      <div className="flex h-[72px] items-center gap-2.5 px-6">
        <span className="text-xl font-bold lowercase tracking-tight text-petrol">molibso</span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-petrol">
          Internal
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-petrol text-white shadow-soft"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-4 rounded-2xl border border-border/80 bg-background/80 p-4">
        <p className="text-xs font-semibold text-foreground">molibso GmbH</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Team · Langenfeld</p>
      </div>
    </aside>
  );
}
