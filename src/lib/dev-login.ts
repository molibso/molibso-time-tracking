/** Dummy accounts for clicking around locally. Never enabled in production. */
export const DEV_ACCOUNTS = [
  {
    role: "ADMIN" as const,
    email: "admin@local.dev",
    label: "Admin",
    hint: "Boss view — team, approvals, analytics",
  },
  {
    role: "EMPLOYEE" as const,
    email: "employee@local.dev",
    label: "Employee",
    hint: "Personal time, leave, and assigned work",
  },
];

export function isDevAccountEmail(email: string): boolean {
  return DEV_ACCOUNTS.some((account) => account.email === email.toLowerCase());
}

/** True only for `next dev` aimed at this machine. */
export function isLocalDevLoginEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const raw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    const host = new URL(raw).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}
