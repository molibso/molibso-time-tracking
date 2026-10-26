/** A full day is 8 hours. More is overtime, less is time still owed. */
export const FULL_DAY_SECONDS = 8 * 60 * 60;

export function balanceSeconds(workedSeconds: number): number {
  return Math.floor(workedSeconds) - FULL_DAY_SECONDS;
}

/** Compact "+2h 15m" or "-45m". Zero is "0m". */
export function formatBalance(totalSeconds: number): string {
  if (totalSeconds === 0) return "0m";
  const sign = totalSeconds > 0 ? "+" : "-";
  const abs = Math.abs(Math.floor(totalSeconds));
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const body = hours > 0 ? (minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`) : `${minutes}m`;
  return `${sign}${body}`;
}
