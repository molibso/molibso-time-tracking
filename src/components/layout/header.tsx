import type { Role } from "@prisma/client";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

export function Header({
  role,
  user,
  notifications,
}: {
  role: Role;
  user: { name: string; email: string; avatarUrl?: string | null };
  notifications: NotificationItem[];
}) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-border/80 bg-surface/80 px-4 backdrop-blur-md lg:px-8">
      <MobileNav role={role} />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="hidden md:block">
          <CommandPalette role={role} />
        </div>
        <ThemeToggle />
        <NotificationBell notifications={notifications} />
        <UserMenu name={user.name} email={user.email} role={role} avatarUrl={user.avatarUrl} />
      </div>
    </header>
  );
}
