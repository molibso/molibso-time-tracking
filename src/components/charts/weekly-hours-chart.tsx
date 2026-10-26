"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDuration } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";
import type { WorkedChartPoint } from "@/lib/chart-range";

const HOUR = 3600;
const WORKDAY = 8 * HOUR;

function axisMaxSeconds(peak: number): number {
  const needed = Math.max(peak, WORKDAY);
  return Math.ceil(needed / HOUR) * HOUR;
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

function barFill(point: WorkedChartPoint): string {
  if (point.future) return "hsl(var(--muted))";
  return point.seconds >= WORKDAY ? "hsl(var(--success))" : "hsl(var(--danger))";
}

export function WeeklyHoursChart({ data }: { data: WorkedChartPoint[] }) {
  const { t } = useLocale();
  const peak = data.reduce((max, day) => Math.max(max, day.seconds), 0);
  const axisMax = axisMaxSeconds(peak);
  const crowded = data.length > 10;

  return (
    <ResponsiveContainer width="100%" height={crowded ? 280 : 240}>
      <BarChart data={data} margin={{ top: 22, right: 8, left: 4, bottom: crowded ? 16 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="day"
          interval={0}
          tick={(props: { x: number; y: number; payload: { value: string }; index: number }) => {
            const point = data[props.index];
            const fill = point ? barFill(point) : "hsl(var(--muted-foreground))";
            return (
              <text
                x={props.x}
                y={props.y}
                dy={crowded ? 8 : 12}
                textAnchor={crowded ? "end" : "middle"}
                transform={crowded ? `rotate(-40 ${props.x} ${props.y})` : undefined}
                fill={point?.future ? "hsl(var(--muted-foreground))" : fill}
                fontSize={12}
              >
                {props.payload.value}
              </text>
            );
          }}
          axisLine={false}
          tickLine={false}
          height={crowded ? 48 : 30}
        />
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
        <ReferenceLine y={WORKDAY} stroke="hsl(var(--foreground))" strokeOpacity={0.35} strokeDasharray="4 4" />
        <Bar dataKey="seconds" radius={[6, 6, 0, 0]} maxBarSize={36}>
          {data.map((point, index) => (
            <Cell key={`${point.day}-${index}`} fill={barFill(point)} />
          ))}
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
