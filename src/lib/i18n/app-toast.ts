"use client";

import { toast as sonner } from "sonner";
import { localizeActionText } from "@/lib/i18n/action-text";
import type { Locale } from "@/lib/i18n/messages";

let locale: Locale = "en";

export function bindActionLocale(next: Locale) {
  locale = next;
}

function text(message?: string) {
  return localizeActionText(message, locale);
}

export const toast = {
  success: (message?: string) => sonner.success(text(message)),
  error: (message?: string) => sonner.error(text(message)),
  message: (message?: string) => sonner.message(text(message)),
};
