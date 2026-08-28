import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getRoleView } from "@/lib/role-views";
import { startOfDay, endOfDay, startOfWeek } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AttendanceTrendChart,
  OvertimeChart,
  UtilizationChart,
  VacationUsageChart,
} from "@/components/charts/analytics-charts";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "ANALYTICS_VIEW")) redirect("/dashboard");

  const roleView = getRoleView(session.user.role);
  const now = new Date();

  // Attendance trend — last 14 days
  const trendDays: { date: string; present: number; absent: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const [present, absent] = await Promise.all([
      prisma.attendance.count({ where: { date: { gte: startOfDay(d), lte: endOfDay(d) }, status: "PRESENT" } }),
      prisma.attendance.count({ where: { date: { gte: startOfDay(d), lte: endOfDay(d) }, status: "ABSENT" } }),
    ]);
    trendDays.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), present, absent });
  }

  // Overtime — last 8 weeks
  const overtimeWeeks: { week: string; overtimeHours: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const start = startOfWeek(weekStart);
    const end = endOfDay(new Date(start.getTime() + 6 * 86400000));
    const result = await prisma.attendance.aggregate({
      where: { date: { gte: start, lte: end } },
      _sum: { overtimeMinutes: true },
    });
    overtimeWeeks.push({
      week: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      overtimeHours: +((result._sum.overtimeMinutes ?? 0) / 60).toFixed(1),
    });
  }

  // Employee utilization — worked hours this month vs expected weekly hours * ~4.33 weeks
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    include: {
      attendances: {
        where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      },
    },
    take: 10,
    orderBy: { firstName: "asc" },
  });

  const utilization = employees.map((e) => {
    const workedMinutes = e.attendances.reduce((sum, a) => sum + a.totalWorkedMinutes, 0);
    const expectedMinutes = e.weeklyHours * 60 * 4.33;
    const pct = expectedMinutes > 0 ? Math.min(120, Math.round((workedMinutes / expectedMinutes) * 100)) : 0;
    return { name: `${e.firstName} ${e.lastName}`, utilization: pct };
  });

  // Vacation usage breakdown
  const vacationAgg = await prisma.leaveRequest.groupBy({
    by: ["type"],
    where: { status: "APPROVED" },
    _sum: { totalDays: true },
  });
  const vacationData = vacationAgg.map((v) => ({
    name: v.type.toLowerCase().replace("_", " "),
    value: v._sum.totalDays ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">{roleView.pageCopy.analytics}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance trend — last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={trendDays} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overtime — last 8 weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <OvertimeChart data={overtimeWeeks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee utilization (this month)</CardTitle>
          </CardHeader>
          <CardContent>
            {utilization.length > 0 ? (
              <UtilizationChart data={utilization} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Not enough data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vacation & leave usage</CardTitle>
          </CardHeader>
          <CardContent>
            {vacationData.length > 0 ? (
              <VacationUsageChart data={vacationData} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No approved leave recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
