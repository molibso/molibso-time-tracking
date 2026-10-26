import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { startOfDay, endOfDay, startOfWeek } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/get-locale";
import { intlLocale, translate } from "@/lib/i18n/messages";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AttendanceTrendChart,
  OvertimeChart,
  ProjectHoursChart,
} from "@/components/charts/analytics-charts";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "ANALYTICS_VIEW")) redirect("/dashboard");

  const locale = await getLocale();
  const now = new Date();
  const projectRangeStart = startOfDay(new Date(now.getTime() - 89 * 86400000));

  const trendDays = Array.from({ length: 14 }, (_, index) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - index));
    return {
      start: startOfDay(d),
      end: endOfDay(d),
      date: d.toLocaleDateString(intlLocale(locale), { month: "short", day: "numeric" }),
      present: 0,
      absent: 0,
    };
  });

  const overtimeWeeks = Array.from({ length: 8 }, (_, index) => {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (7 - index) * 7);
    const start = startOfWeek(weekStart);
    return {
      start,
      end: endOfDay(new Date(start.getTime() + 6 * 86400000)),
      week: start.toLocaleDateString(intlLocale(locale), { month: "short", day: "numeric" }),
      overtimeMinutes: 0,
    };
  });

  const rangeStart = overtimeWeeks[0].start;
  const rangeEnd = new Date(
    Math.max(overtimeWeeks[overtimeWeeks.length - 1].end.getTime(), trendDays[trendDays.length - 1].end.getTime()),
  );

  const [rows, projectTimeEntries] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: { gte: rangeStart, lte: rangeEnd } },
      select: { date: true, status: true, overtimeMinutes: true },
    }),
    prisma.taskTimeEntry.findMany({
      where: {
        endedAt: { not: null },
        durationSeconds: { not: null, gt: 0 },
        startedAt: { gte: projectRangeStart },
      },
      select: {
        durationSeconds: true,
        task: {
          select: {
            projectId: true,
            project: { select: { id: true, name: true } },
            parent: {
              select: {
                projectId: true,
                project: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  for (const row of rows) {
    const trend = trendDays.find((day) => row.date >= day.start && row.date <= day.end);
    if (trend && row.status === "PRESENT") trend.present += 1;
    if (trend && row.status === "ABSENT") trend.absent += 1;

    for (const week of overtimeWeeks) {
      if (row.date >= week.start && row.date <= week.end) week.overtimeMinutes += row.overtimeMinutes;
    }
  }

  const overtimeChart = overtimeWeeks.map((week) => ({
    week: week.week,
    overtimeHours: +(week.overtimeMinutes / 60).toFixed(1),
  }));

  const projectSeconds = new Map<string, { name: string; seconds: number }>();
  for (const entry of projectTimeEntries) {
    const project = entry.task.project ?? entry.task.parent?.project ?? null;
    const key = project?.id ?? "__none__";
    const name = project?.name ?? translate(locale, "chart.noProject");
    const current = projectSeconds.get(key) ?? { name, seconds: 0 };
    current.seconds += entry.durationSeconds ?? 0;
    projectSeconds.set(key, current);
  }

  const projectHours = Array.from(projectSeconds.values())
    .map((row) => ({
      name: row.name,
      hours: Math.round((row.seconds / 3600) * 10) / 10,
      seconds: row.seconds,
    }))
    .filter((row) => row.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  const projectHoursTotal = Math.round(
    (projectHours.reduce((sum, row) => sum + row.seconds, 0) / 3600) * 10,
  ) / 10;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "analytics.title")}</h1>
        <p className="text-sm text-muted-foreground">{translate(locale, "analytics.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{translate(locale, "analytics.projectHours")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {translate(locale, "analytics.projectHoursHint")}
            {projectHours.length > 0 && (
              <> · {translate(locale, "analytics.projectHoursTotal", { hours: projectHoursTotal })}</>
            )}
          </p>
        </CardHeader>
        <CardContent>
          {projectHours.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <ProjectHoursChart data={projectHours.map(({ name, hours }) => ({ name, hours }))} />
              <ul className="space-y-2 self-center">
                {projectHours.map((row, index) => (
                  <li
                    key={`${row.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">{row.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{row.hours.toFixed(1)} h</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {translate(locale, "analytics.projectHoursEmpty")}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{translate(locale, "analytics.trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={trendDays.map(({ date, present, absent }) => ({ date, present, absent }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overtime — last 8 weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <OvertimeChart data={overtimeChart} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
