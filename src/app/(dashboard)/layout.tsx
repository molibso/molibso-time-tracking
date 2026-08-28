import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const [notifications, employee] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    session.user.employeeId
      ? prisma.employee.findUnique({ where: { id: session.user.employeeId } })
      : null,
  ]);

  const displayName = employee ? `${employee.firstName} ${employee.lastName}` : session.user.email ?? "User";

  const role = session.user.role ?? Role.EMPLOYEE;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          role={role}
          user={{ name: displayName, email: session.user.email ?? "", avatarUrl: employee?.avatarUrl }}
          notifications={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            isRead: n.isRead,
            link: n.link,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
