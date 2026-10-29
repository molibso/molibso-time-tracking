"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/app-toast";
import { useLocale } from "@/components/layout/locale-provider";
import { Check, X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewLeaveRequest } from "@/actions/leave";
import { formatDateRange } from "@/lib/utils";
import { leaveKindKey, leavePartKey } from "@/lib/i18n/labels";

export interface PendingLeaveRow {
  id: string;
  employeeName: string;
  type: string;
  dayPart?: string | null;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string | null;
}

export function LeaveApprovals({ rows }: { rows: PendingLeaveRow[] }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function review(id: string, status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const result = await reviewLeaveRequest({ id, status, reviewComment: comments[id] });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("leave.nonePending")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("leave.col.employee")}</TableHead>
          <TableHead>{t("leave.col.type")}</TableHead>
          <TableHead>{t("leave.col.dates")}</TableHead>
          <TableHead>{t("leave.col.days")}</TableHead>
          <TableHead>{t("leave.col.comment")}</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const kind = leaveKindKey(r.type);
          const part = leavePartKey(r.dayPart);
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.employeeName}</TableCell>
              <TableCell>
                {kind ? t(kind) : r.type}
                {part ? ` · ${t(part)}` : ""}
              </TableCell>
              <TableCell className="tabular-nums">{formatDateRange(r.startDate, r.endDate, locale)}</TableCell>
              <TableCell className="tabular-nums">
                {r.totalDays === 1 ? t("leave.dayCount", { count: r.totalDays }) : t("leave.dayCountPlural", { count: r.totalDays })}
              </TableCell>
              <TableCell>
                <Input
                  placeholder={t("ph.optionalComment")}
                  className="h-8 w-40"
                  value={comments[r.id] ?? ""}
                  onChange={(e) => setComments((c) => ({ ...c, [r.id]: e.target.value }))}
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="success" disabled={isPending} onClick={() => review(r.id, "APPROVED")}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" disabled={isPending} onClick={() => review(r.id, "REJECTED")}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
