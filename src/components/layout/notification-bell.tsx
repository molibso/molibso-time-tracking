"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import { useLocale } from "@/components/layout/locale-provider";
import { localizeNotification } from "@/lib/i18n/notification-text";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const { locale, t } = useLocale();
  const [items, setItems] = useState(notifications);
  const unreadCount = items.filter((n) => !n.isRead).length;

  async function handleOpenItem(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await markNotificationRead(id);
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsRead();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications.aria")}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0">{t("notifications.title")}</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} className="text-xs text-primary hover:underline">
              {t("notifications.markAll")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t("notifications.empty")}</div>
        )}
        <div className="max-h-80 overflow-y-auto">
          {items.map((n) => {
            const text = localizeNotification(locale, n);
            return (
            <DropdownMenuItem key={n.id} asChild onClick={() => handleOpenItem(n.id)}>
              <Link
                href={n.link ?? "#"}
                className={cn("flex flex-col items-start gap-0.5 rounded-lg", !n.isRead && "bg-primary/5")}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  {text.title}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-2">{text.message}</span>
              </Link>
            </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
