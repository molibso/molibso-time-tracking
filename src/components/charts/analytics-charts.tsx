"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useLocale } from "@/components/layout/locale-provider";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#F43F5E", "#0EA5E9", "#8B5CF6"];

const tooltipStyle = {
  background: "hsl(var(--surface))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};
const axisTick = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

export function AttendanceTrendChart({ data }: { data: { date: string; present: number; absent: number }[] }) {
  const { t } = useLocale();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="present" stroke="#10B981" strokeWidth={2} dot={false} name={t("chart.present")} />
        <Line type="monotone" dataKey="absent" stroke="#F43F5E" strokeWidth={2} dot={false} name={t("chart.absent")} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OvertimeChart({ data }: { data: { week: string; overtimeHours: number }[] }) {
  const { t } = useLocale();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, t("chart.overtime")]} />
        <Bar dataKey="overtimeHours" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UtilizationChart({ data }: { data: { name: string; utilization: number }[] }) {
  const { t } = useLocale();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis type="number" domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} unit="%" />
        <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={110} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, t("chart.utilization")]} />
        <Bar dataKey="utilization" fill="#4F46E5" radius={[0, 6, 6, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VacationUsageChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProjectHoursChart({ data }: { data: { name: string; hours: number }[] }) {
  const { t } = useLocale();
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 24, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} unit="h" />
        <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={120} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`${value.toFixed(1)} h`, t("chart.hours")]}
        />
        <Bar dataKey="hours" radius={[0, 6, 6, 0]} maxBarSize={20}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
