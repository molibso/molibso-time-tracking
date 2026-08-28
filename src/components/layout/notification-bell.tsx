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
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">You're all caught up.</div>
        )}
        <div className="max-h-80 overflow-y-auto">
          {items.map((n) => (
            <DropdownMenuItem key={n.id} asChild onClick={() => handleOpenItem(n.id)}>
              <Link
                href={n.link ?? "#"}
                className={cn("flex flex-col items-start gap-0.5 rounded-lg", !n.isRead && "bg-primary/5")}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  {n.title}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
