import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVacationBalance } from "@/lib/queries/dashboard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PasswordForm } from "@/components/profile/password-form";
import { translate } from "@/lib/i18n/messages";
import { initials, formatDate } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/get-locale";

function formatDays(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default async function ProfilePage() {
  const locale = await getLocale();
  const session = await auth();
  if (!session) redirect("/login");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/dashboard");

  const [employee, vacation] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId }, include: { department: true, user: true } }),
    getVacationBalance(employeeId),
  ]);

  if (!employee) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "profile.title")}</h1>
        <p className="text-base text-muted-foreground">{translate(locale, "profile.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 text-center">
            <Avatar className="mx-auto h-16 w-16">
              {employee.avatarUrl && <AvatarImage src={employee.avatarUrl} alt={employee.firstName} />}
              <AvatarFallback className="text-lg">{initials(employee.firstName, employee.lastName)}</AvatarFallback>
            </Avatar>
            <h2 className="mt-3 font-semibold">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Badge variant="outline">{employee.department?.name ?? "No department"}</Badge>
              <Badge variant="outline" className="capitalize">
                {employee.employmentType.toLowerCase().replace("_", " ")}
              </Badge>
            </div>
            <dl className="mt-6 space-y-2 text-left text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{translate(locale, "kpi.vacation")}</dt>
                <dd className="font-semibold tabular-nums">{formatDays(vacation.remaining)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate">{employee.user.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Hire date</dt>
                <dd className="tabular-nums">{formatDate(employee.hireDate, locale)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Weekly hours</dt>
                <dd>{employee.weeklyHours}h</dd>
              </div>
            </dl>
            <p className="mt-2 text-left text-sm text-muted-foreground">
              {translate(locale, "kpi.vacationUsed", {
                used: formatDays(vacation.used),
                allowance: formatDays(vacation.allowance),
              })}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{translate(locale, "profile.passwordTitle")}</CardTitle>
              <p className="text-base text-muted-foreground">{translate(locale, "profile.passwordHint")}</p>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
