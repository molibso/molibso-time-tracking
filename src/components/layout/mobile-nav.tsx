"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Role } from "@prisma/client";
import { visibleNavItems } from "./nav-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = visibleNavItems(role);

  return (
    <div className="lg:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-[90] flex">
          <div className="absolute inset-0 bg-petrol/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-full w-[280px] flex-col bg-surface shadow-elevated animate-slide-up">
            <div className="flex h-[72px] items-center justify-between px-5">
              <div>
                <p className="text-lg font-bold lowercase tracking-tight text-petrol">molibso</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Internal</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-0.5 px-3">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-petrol text-white"
                        : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-[18px] w-[18px]", active && "text-primary")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
