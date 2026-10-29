import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AccountMenu } from "@/components/layout/account-menu";
import { NavigationPending, PendingOutlet } from "@/components/layout/navigation-pending";
import { OvertimeWatch } from "@/components/time-tracking/overtime-watch";
import { Skeleton } from "@/components/ui/skeleton";

function AccountFallback() {
  return (
    <div className="flex items-center gap-1.5">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="hidden h-9 w-28 rounded-lg sm:block" />
    </div>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role ?? Role.EMPLOYEE;

  return (
    <NavigationPending>
      <div className="flex min-h-screen bg-background">
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            role={role}
            account={
              <Suspense fallback={<AccountFallback />}>
                <AccountMenu
                  userId={session.user.id}
                  employeeId={session.user.employeeId}
                  role={role}
                  email={session.user.email ?? ""}
                />
              </Suspense>
            }
          />
          <OvertimeWatch />
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <PendingOutlet>{children}</PendingOutlet>
          </main>
        </div>
      </div>
    </NavigationPending>
  );
}
