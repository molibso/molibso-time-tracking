"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/app-toast";
import { watchOvertime } from "@/actions/time-tracking";
import { useLocale } from "@/components/layout/locale-provider";

/** While this person is clocked in, warn the boss past 1 hour of overtime and clock out at 2 hours. */
export function OvertimeWatch() {
  const router = useRouter();
  const { t } = useLocale();
  const stopped = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function check() {
      const result = await watchOvertime();
      if (cancelled) return;
      if (result.clockedOut && !stopped.current) {
        stopped.current = true;
        toast.message(t("clock.autoOut"));
        router.refresh();
        return;
      }
      timer = setTimeout(check, result.watching ? 3000 : 30_000);
    }

    void check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router, t]);

  return null;
}
