import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { HolidayManager } from "@/components/settings/holiday-manager";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";

export default async function SettingsPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "SETTINGS_MANAGE")) redirect("/dashboard");

  const locale = await getLocale();
  const [settings, holidays] = await Promise.all([
    prisma.companySettings.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global", companyName: "molibso GmbH" },
    }),
    prisma.holiday.findMany({ orderBy: { date: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{translate(locale, "settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">{translate(locale, "settings.company")}</TabsTrigger>
          <TabsTrigger value="holidays">{translate(locale, "settings.holidays")}</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardContent className="pt-6">
              <CompanySettingsForm
                defaultValues={{
                  companyName: settings.companyName,
                  timezone: settings.timezone,
                  workDayStartTime: settings.workDayStartTime,
                  workDayEndTime: settings.workDayEndTime,
                  standardWeeklyHours: settings.standardWeeklyHours,
                  breakDurationMinutes: settings.breakDurationMinutes,
                  maxBreaksPerDay: settings.maxBreaksPerDay,
                  overtimeThresholdDaily: settings.overtimeThresholdDaily,
                  defaultVacationDays: settings.defaultVacationDays,
                  notifyClockInReminder: settings.notifyClockInReminder,
                  notifyClockOutReminder: settings.notifyClockOutReminder,
                  notifyBreakReminder: settings.notifyBreakReminder,
                  notifyLeaveUpdates: settings.notifyLeaveUpdates,
                  notifyOvertimeAlert: settings.notifyOvertimeAlert,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays">
          <Card>
            <CardContent className="pt-6">
              <HolidayManager
                holidays={holidays.map((h) => ({
                  id: h.id,
                  name: h.name,
                  date: h.date.toISOString(),
                  endDate: h.endDate?.toISOString() ?? null,
                  isPaid: h.isPaid,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
