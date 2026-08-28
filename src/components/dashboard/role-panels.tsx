import { Role } from "@prisma/client";
import { isBoss } from "@/lib/rbac";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardCheck, Users, Settings, BarChart3 } from "lucide-react";

export function PendingActionsCard({
  pendingLeave,
  pendingCorrections,
}: {
  pendingLeave: number;
  pendingCorrections: number;
}) {
  const total = pendingLeave + pendingCorrections;
  if (total === 0) return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-warning" />
          Pending approvals
          <Badge variant="warning">{total}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {pendingLeave > 0 && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/leave">{pendingLeave} leave request{pendingLeave !== 1 ? "s" : ""}</Link>
          </Button>
        )}
        {pendingCorrections > 0 && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/attendance">{pendingCorrections} time correction{pendingCorrections !== 1 ? "s" : ""}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminQuickLinks({ employeeCount }: { employeeCount: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick links</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/employees"
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-hover"
        >
          <Users className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">{employeeCount} teammates</p>
            <p className="text-xs text-muted-foreground">Manage team</p>
          </div>
        </Link>
        <Link
          href="/analytics"
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-hover"
        >
          <BarChart3 className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">Analytics</p>
            <p className="text-xs text-muted-foreground">Team trends</p>
          </div>
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-hover"
        >
          <Settings className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">Settings</p>
            <p className="text-xs text-muted-foreground">Policies & holidays</p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

export function RoleCapabilitiesCard({ role, capabilities }: { role: Role; capabilities: string[] }) {
  if (!isBoss(role)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What you can do in this role</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {capabilities.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
