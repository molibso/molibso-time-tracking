"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelLeaveRequest } from "@/actions/leave";
import { formatDateRange } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";
import { leaveKindKey, leaveStatusKey } from "@/lib/i18n/labels";

export interface MyLeaveRow {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: string;
  reviewComment: string | null;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "muted"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "muted",
};

export function MyLeaveTable({ rows, readOnly = false }: { rows: MyLeaveRow[]; readOnly?: boolean }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [isPending, startTransition] = useTransition();

  function cancel(id: string) {
    startTransition(async () => {
      const result = await cancelLeaveRequest(id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {readOnly ? t("leave.emptyTeammate") : t("leave.empty")}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("leave.col.type")}</TableHead>
          <TableHead>{t("leave.col.dates")}</TableHead>
          <TableHead>{t("leave.col.days")}</TableHead>
          <TableHead>{t("leave.col.status")}</TableHead>
          <TableHead>{t("leave.col.comment")}</TableHead>
          {!readOnly && <TableHead></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const kind = leaveKindKey(r.type);
          const status = leaveStatusKey(r.status);
          return (
            <TableRow key={r.id}>
              <TableCell>{kind ? t(kind) : r.type}</TableCell>
              <TableCell className="tabular-nums">{formatDateRange(r.startDate, r.endDate, locale)}</TableCell>
              <TableCell className="tabular-nums">
                {r.totalDays === 1 ? t("leave.dayCount", { count: r.totalDays }) : t("leave.dayCountPlural", { count: r.totalDays })}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "muted"}>{status ? t(status) : r.status}</Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {r.reviewComment ?? "—"}
              </TableCell>
              {!readOnly && (
                <TableCell>
                  {r.status === "PENDING" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      aria-label={t("common.cancel")}
                      onClick={() => cancel(r.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
