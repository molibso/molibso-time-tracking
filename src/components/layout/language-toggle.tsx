"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/components/layout/locale-provider";
import type { Locale, MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const OPTIONS: { id: Locale; labelKey: MessageKey }[] = [
  { id: "en", labelKey: "common.english" },
  { id: "de", labelKey: "common.german" },
  { id: "fr", labelKey: "common.french" },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.language")}>
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => setLocale(option.id)}
            className={cn(locale === option.id && "font-semibold text-foreground")}
          >
            {t(option.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
