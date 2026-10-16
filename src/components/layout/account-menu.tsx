import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

export async function AccountMenu({
  userId,
  employeeId,
  role,
  email,
}: {
  userId: string;
  employeeId: string | null;
  role: Role;
  email: string;
}) {
  const [notifications, employee] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    employeeId ? prisma.employee.findUnique({ where: { id: employeeId } }) : null,
  ]);

  const displayName = employee ? `${employee.firstName} ${employee.lastName}` : email || "User";

  return (
    <>
      <NotificationBell
        notifications={notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          isRead: n.isRead,
          link: n.link,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
      <UserMenu name={displayName} email={email} role={role} avatarUrl={employee?.avatarUrl} />
    </>
  );
}
