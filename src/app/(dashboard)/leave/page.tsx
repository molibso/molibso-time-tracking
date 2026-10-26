import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveRole, hasPermission } from "@/lib/rbac";
import { getVisibleEmployeeIds, leaveEmployeeIdsWhere } from "@/lib/role-scope";
import { resolveTeamView } from "@/lib/team-view";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeaveRequestDialog } from "@/components/leave/leave-request-dialog";
import { MyLeaveTable, type MyLeaveRow } from "@/components/leave/my-leave-table";
import { LeaveApprovals, type PendingLeaveRow } from "@/components/leave/leave-approvals";
import { TeamMemberSelect } from "@/components/layout/team-member-select";
import { RoleBadge } from "@/components/layout/role-badge";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const selfEmployeeId = session.user.employeeId;
  if (!selfEmployeeId) redirect("/dashboard");

  const { employeeId: requestedId } = await searchParams;
  const role = session.user.role;
  const locale = await getLocale();
  const boss = effectiveRole(role) === "ADMIN";
  const canApprove = hasPermission(role, "LEAVE_APPROVE");

  const view = await resolveTeamView({
    role,
    selfEmployeeId,
    requestedId,
  });
  const employeeId = view.viewedEmployeeId;
  const visibleIds = await getVisibleEmployeeIds(prisma, role, selfEmployeeId);

  const [personLeave, pendingLeave] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    }),
    canApprove
      ? prisma.leaveRequest.findMany({
          where: { status: "PENDING", ...leaveEmployeeIdsWhere(visibleIds) },
          include: { employee: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const personRows: MyLeaveRow[] = personLeave.map((l) => ({
    id: l.id,
    type: l.type,
    startDate: l.startDate,
    endDate: l.endDate,
    totalDays: l.totalDays,
    status: l.status,
    reviewComment: l.reviewComment,
  }));

  const pendingRows: PendingLeaveRow[] = pendingLeave.map((l) => ({
    id: l.id,
    employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
    type: l.type,
    startDate: l.startDate,
    endDate: l.endDate,
    totalDays: l.totalDays,
    reason: l.reason,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "leave.title")}</h1>
            <RoleBadge role={role} />
          </div>
          <p className="text-sm text-muted-foreground">
            {view.isSelf
              ? translate(locale, boss ? "leave.subtitleBoss" : "leave.subtitle")
              : translate(locale, "leave.forName", { name: view.viewedName })}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {view.canViewTeam && <TeamMemberSelect members={view.members} value={employeeId} />}
          {view.isSelf && <LeaveRequestDialog />}
        </div>
      </div>

      {canApprove ? (
        <Tabs defaultValue="approvals">
          <TabsList>
            <TabsTrigger value="approvals">
              {translate(locale, "leave.approvals")} {pendingRows.length > 0 && `(${pendingRows.length})`}
            </TabsTrigger>
            <TabsTrigger value="person">
              {view.isSelf ? translate(locale, "leave.myRequests") : translate(locale, "leave.theirRequests", { name: view.viewedName })}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="approvals">
            <Card>
              <CardContent className="pt-5">
                <LeaveApprovals rows={pendingRows} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="person">
            <Card>
              <CardContent className="pt-5">
                <MyLeaveTable rows={personRows} readOnly={!view.isSelf} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-5">
            <MyLeaveTable rows={personRows} readOnly={!view.isSelf} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
