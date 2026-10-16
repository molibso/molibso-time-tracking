import { cookies } from "next/headers";
import { parseLocale, type Locale } from "@/lib/i18n/messages";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return parseLocale(jar.get("locale")?.value);
}
