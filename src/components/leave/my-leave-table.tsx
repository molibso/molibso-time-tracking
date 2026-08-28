"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelLeaveRequest } from "@/actions/leave";
import { formatDate } from "@/lib/utils";

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
        {readOnly ? "No leave requests for this teammate." : "You haven't requested any leave yet."}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Comment</TableHead>
          {!readOnly && <TableHead></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="capitalize">{r.type.toLowerCase().replace("_", " ")}</TableCell>
            <TableCell>
              {formatDate(r.startDate)} – {formatDate(r.endDate)}
            </TableCell>
            <TableCell>{r.totalDays}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">
                {r.status.toLowerCase()}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
              {r.reviewComment ?? "—"}
            </TableCell>
            {!readOnly && (
              <TableCell>
                {r.status === "PENDING" && (
                  <Button variant="ghost" size="icon" disabled={isPending} onClick={() => cancel(r.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
