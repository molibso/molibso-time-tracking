import { CorrectionRequestDialog } from "@/components/time-tracking/correction-request-dialog";
import { Badge } from "@/components/ui/badge";
import { emptyShiftCopy, monthTitle, weekTitle, type ShiftPeriod } from "@/lib/shift-period";
import { intlLocale, translate, type Locale } from "@/lib/i18n/messages";
import { formatDate, formatDuration, formatTime, startOfMonth, startOfWeek } from "@/lib/utils";
import { balanceSeconds, formatBalance } from "@/lib/day-balance";
import { sumBreakSeconds, sumWorkedSeconds } from "@/lib/worked-time";

type ShiftEntry = {
  id: string;
  clockIn: Date;
  clockOut: Date | null;
  breaks: { startedAt: Date; endedAt: Date | null }[];
};

type ShiftDay = {
  id: string;
  date: Date;
  clockEntries: ShiftEntry[];
};

function dayLabel(date: Date, locale: Locale): string {
  return date.toLocaleDateString(intlLocale(locale), { weekday: "short", month: "short", day: "numeric" });
}

function sessionLabel(entry: ShiftEntry): string {
  const start = formatTime(entry.clockIn);
  if (!entry.clockOut) return `${start} – now`;
  const end = formatTime(entry.clockOut);
  const worked = sumWorkedSeconds([entry]);
  const sameMinute = start === end;
  if (sameMinute || worked < 60) return `${start} · ${formatDuration(worked)}`;
  return `${start} – ${end}`;
}

export function ShiftHistory({
  days,
  isSelf,
  period,
  locale,
}: {
  days: ShiftDay[];
  isSelf: boolean;
  period: ShiftPeriod;
  locale: Locale;
}) {
  const now = new Date();
  const months: {
    key: string;
    label: string;
    worked: number;
    weeks: {
      key: string;
      label: string;
      worked: number;
      days: {
        id: string;
        label: string;
        dateLabel: string;
        worked: number;
        breakSeconds: number;
        balance: number;
        sessions: { id: string; label: string }[];
      }[];
    }[];
  }[] = [];

  for (const day of days) {
    const date = new Date(day.date);
    const monthStart = startOfMonth(date);
    const weekStart = startOfWeek(date);
    const monthKey = String(monthStart.getTime());
    const weekKey = String(weekStart.getTime());

    let month = months.find((item) => item.key === monthKey);
    if (!month) {
      month = { key: monthKey, label: monthTitle(monthStart, locale), worked: 0, weeks: [] };
      months.push(month);
    }

    let week = month.weeks.find((item) => item.key === weekKey);
    if (!week) {
      week = { key: weekKey, label: weekTitle(weekStart, now, locale), worked: 0, days: [] };
      month.weeks.push(week);
    }

    const entries = [...day.clockEntries].sort((a, b) => a.clockIn.getTime() - b.clockIn.getTime());
    const worked = sumWorkedSeconds(entries);
    const breakSeconds = sumBreakSeconds(entries);
    month.worked += worked;
    week.worked += worked;
    week.days.push({
      id: day.id,
      label: dayLabel(date, locale),
      dateLabel: formatDate(date, locale),
      worked,
      breakSeconds,
      balance: worked > 0 ? balanceSeconds(worked) : 0,
      sessions: entries.map((entry) => ({ id: entry.id, label: sessionLabel(entry) })),
    });
  }

  if (months.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyShiftCopy(period, isSelf, locale)}</p>;
  }

  const showMonthHeadings = period === "custom" && months.length > 1;
  const showWeekHeadings = period !== "week";

  return (
    <div className="space-y-8">
      {months.map((month) => (
        <section key={month.key} className="space-y-3">
          {showMonthHeadings && (
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">{month.label}</h3>
              <p className="text-sm font-medium tabular-nums">{formatDuration(month.worked)}</p>
            </div>
          )}
          {month.weeks.map((week) => (
            <div key={week.key} className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center justify-between gap-3 bg-muted/50 px-4 py-2.5">
                <p
                  className={
                    showWeekHeadings
                      ? "text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      : "text-xs font-medium text-muted-foreground"
                  }
                >
                  {showWeekHeadings
                    ? week.label
                    : week.days.length === 1
                      ? translate(locale, "shifts.oneDay")
                      : translate(locale, "shifts.days", { count: week.days.length })}
                </p>
                <p className="text-xs font-medium tabular-nums">{formatDuration(week.worked)}</p>
              </div>
              <ul>
                {week.days.map((day) => (
                  <li key={day.id} className="border-t border-border px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{day.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {day.sessions.length === 1
                            ? translate(locale, "shifts.oneSession")
                            : translate(locale, "shifts.sessions", { count: day.sessions.length })}
                          {day.breakSeconds > 0 ? ` · ${translate(locale, "shifts.break", { time: formatDuration(day.breakSeconds) })}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold tabular-nums">{formatDuration(day.worked)}</span>
                        {day.worked > 0 && day.balance !== 0 && (
                          <Badge variant={day.balance > 0 ? "success" : "danger"}>{formatBalance(day.balance)}</Badge>
                        )}
                        {isSelf && <CorrectionRequestDialog attendanceId={day.id} date={day.dateLabel} />}
                      </div>
                    </div>
                    {day.sessions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {day.sessions.map((session) => (
                          <span key={session.id} className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
                            {session.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
