import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/profile/profile-form";
import { initials, formatDate } from "@/lib/utils";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/dashboard");

  const [employee, upcomingShifts] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId }, include: { department: true, user: true } }),
    prisma.shift.findMany({
      where: { employeeId, startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
  ]);

  if (!employee) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">Your details, schedule, and account settings.</p>
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
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Employee code</dt>
                <dd>{employee.employeeCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate">{employee.user.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Hire date</dt>
                <dd>{formatDate(employee.hireDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Weekly hours</dt>
                <dd>{employee.weeklyHours}h</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm defaultValues={{ phone: employee.phone ?? "", avatarUrl: employee.avatarUrl ?? "" }} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingShifts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No shifts scheduled yet.</p>
          ) : (
            <div className="space-y-2">
              {upcomingShifts.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.location ?? "—"}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(s.startTime)} {s.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
