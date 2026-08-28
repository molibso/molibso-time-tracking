"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewLeaveRequest } from "@/actions/leave";
import { formatDate } from "@/lib/utils";

export interface PendingLeaveRow {
  id: string;
  employeeName: string;
  type: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string | null;
}

export function LeaveApprovals({ rows }: { rows: PendingLeaveRow[] }) {
  const router = useRouter();
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
    return <p className="py-8 text-center text-sm text-muted-foreground">No leave requests waiting for review.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.employeeName}</TableCell>
            <TableCell className="capitalize">{r.type.toLowerCase().replace("_", " ")}</TableCell>
            <TableCell>
              {formatDate(r.startDate)} – {formatDate(r.endDate)}
            </TableCell>
            <TableCell>{r.totalDays}</TableCell>
            <TableCell>
              <Input
                placeholder="Optional comment"
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
        ))}
      </TableBody>
    </Table>
  );
}
