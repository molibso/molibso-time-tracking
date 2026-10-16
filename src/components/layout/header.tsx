import type { Role } from "@prisma/client";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";

export function Header({ role, account }: { role: Role; account: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-border/80 bg-surface/80 px-4 backdrop-blur-md lg:px-8">
      <MobileNav role={role} />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="hidden md:block">
          <CommandPalette role={role} />
        </div>
        <LanguageToggle />
        <ThemeToggle />
        {account}
      </div>
    </header>
  );
}
