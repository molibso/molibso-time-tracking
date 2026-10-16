"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Search, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { visibleNavItems } from "./nav-config";
import { useBeginNavigation } from "./navigation-pending";
import { useLocale } from "@/components/layout/locale-provider";

export function CommandPalette({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const beginNavigation = useBeginNavigation();
  const { setTheme, theme } = useTheme();
  const { t } = useLocale();

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function go(href: string) {
    setOpen(false);
    beginNavigation(href);
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted-foreground hover:bg-surface-hover"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">{t("common.search")}</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        className="fixed left-1/2 top-24 z-[100] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated animate-slide-up-x"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Command.Input
            placeholder={t("common.searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">{t("common.noResults")}</Command.Empty>

          <Command.Group heading={t("common.navigate")} className="px-2 py-1 text-xs font-medium text-muted-foreground">
            {visibleNavItems(role).map((item) => (
              <Command.Item
                key={item.href}
                onSelect={() => go(item.href)}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-surface-hover"
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading={t("common.actions")} className="px-2 py-1 text-xs font-medium text-muted-foreground">
            <Command.Item
              onSelect={() => {
                setTheme(theme === "dark" ? "light" : "dark");
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-surface-hover"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {t("common.toggleTheme")}
            </Command.Item>
            <Command.Item
              onSelect={() => signOut({ callbackUrl: "/login" })}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-danger data-[selected=true]:bg-danger/10"
            >
              <LogOut className="h-4 w-4" />
              {t("common.signOut")}
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
