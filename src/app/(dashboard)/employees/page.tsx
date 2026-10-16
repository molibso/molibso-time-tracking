import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { EmployeeTable, type EmployeeRow } from "@/components/employees/employee-table";
import { RoleBadge } from "@/components/layout/role-badge";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";

export default async function EmployeesPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "EMPLOYEE_MANAGE")) redirect("/dashboard");

  const role = session.user.role;
  const locale = await getLocale();

  const employees = await prisma.employee.findMany({
    include: { user: true },
    orderBy: { firstName: "asc" },
  });

  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.user.email,
    phone: e.phone,
    position: e.position,
    employmentType: e.employmentType,
    status: e.status,
    role: e.user.role === "MANAGER" ? "ADMIN" : e.user.role,
    hireDate: e.hireDate.toISOString(),
    weeklyHours: e.weeklyHours,
    vacationAllowance: e.vacationAllowance,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "team.title")}</h1>
          <RoleBadge role={role} />
        </div>
        <p className="text-sm text-muted-foreground">{translate(locale, "team.subtitle")}</p>
      </div>
      <EmployeeTable data={rows} />
    </div>
  );
}
