"use client";

import { useRouter, usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeamMemberOption } from "@/lib/team-view";
import { useLocale } from "@/components/layout/locale-provider";

export function TeamMemberSelect({
  members,
  value,
}: {
  members: TeamMemberOption[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();

  if (members.length === 0) return null;

  function onChange(employeeId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("employeeId", employeeId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex min-w-[240px] flex-col gap-1.5">
      <Label htmlFor="team-member-select" className="text-xs text-muted-foreground">
        {t("common.viewing")}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="team-member-select" className="h-11 rounded-xl">
          <div className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4 shrink-0 text-petrol" />
            <SelectValue placeholder={t("common.selectTeammate")} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
              {m.isSelf ? ` ${t("common.you")}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
