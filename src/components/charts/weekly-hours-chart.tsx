"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatDuration } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";

const HOUR = 3600;
const WORKDAY = 8 * HOUR;

function axisMaxSeconds(peak: number): number {
  if (peak <= HOUR) return HOUR;
  if (peak <= WORKDAY) return WORKDAY;
  return Math.ceil(peak / HOUR) * HOUR;
}

function axisTicks(max: number): number[] {
  if (max <= HOUR) return [0, 15, 30, 45, 60].map((minutes) => minutes * 60);
  const hours = max / HOUR;
  const step = hours <= 8 ? 2 : hours <= 16 ? 4 : 8;
  const ticks: number[] = [];
  for (let hour = 0; hour <= hours; hour += step) ticks.push(hour * HOUR);
  return ticks;
}

function tickLabel(seconds: number, max: number): string {
  if (max <= HOUR) {
    if (seconds <= 0) return "0";
    if (seconds >= HOUR) return "1h";
    return `${Math.round(seconds / 60)}m`;
  }
  return `${Math.round(seconds / HOUR)}h`;
}

export function WeeklyHoursChart({ data }: { data: { day: string; seconds: number }[] }) {
  const { t } = useLocale();
  const peak = data.reduce((max, day) => Math.max(max, day.seconds), 0);
  const axisMax = axisMaxSeconds(peak);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 22, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, axisMax]}
          ticks={axisTicks(axisMax)}
          tickFormatter={(value: number) => tickLabel(value, axisMax)}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            background: "hsl(var(--surface))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [formatDuration(Number(value) || 0), t("chart.worked")]}
        />
        <Bar dataKey="seconds" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={36}>
          <LabelList
            dataKey="seconds"
            position="top"
            formatter={(value: number) => (Number(value) > 0 ? formatDuration(Number(value)) : "")}
            style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
