"use client";

import { Role } from "@prisma/client";
import { LogOut, User as UserIcon, Settings } from "lucide-react";
import { SignOutDialog, useSignOutChoice } from "@/components/layout/sign-out-dialog";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { effectiveRole, isBoss } from "@/lib/rbac";
import { useLocale } from "@/components/layout/locale-provider";

export function UserMenu({
  name,
  email,
  role,
  avatarUrl,
}: {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}) {
  const [first, ...rest] = name.split(" ");
  const last = rest.join(" ") || first;
  const { t } = useLocale();
  const signOutChoice = useSignOutChoice();
  const roleLabel = t(effectiveRole(role as Role) === "ADMIN" ? "role.boss" : "role.employee");

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover">
          <Avatar>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback>{initials(first, last)}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight">{name}</p>
            <p className="text-xs text-muted-foreground leading-tight">{roleLabel}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon className="h-4 w-4" /> {t("common.myProfile")}
          </Link>
        </DropdownMenuItem>
        {isBoss(role as Role) && (
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" /> {t("common.settings")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOutChoice.request()} className="text-danger">
          <LogOut className="h-4 w-4" /> {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <SignOutDialog
      open={signOutChoice.open}
      pending={signOutChoice.pending}
      onOpenChange={signOutChoice.setOpen}
      onClockOut={() => void signOutChoice.clockOutAndLeave()}
      onLeaveOnly={() => void signOutChoice.leaveOnly()}
    />
    </>
  );
}
