"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/app-toast";
import { Check, X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { reviewCorrectionRequest } from "@/actions/leave";
import { formatDate, formatTime } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";

export interface PendingCorrection {
  id: string;
  employeeName: string;
  date: Date;
  requestedClockIn: Date | null;
  requestedClockOut: Date | null;
  reason: string;
}

export function CorrectionApprovals({ items }: { items: PendingCorrection[] }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [isPending, startTransition] = useTransition();

  function review(id: string, status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const result = await reviewCorrectionRequest({ id, status });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No pending correction requests.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.employeeName}</TableCell>
            <TableCell className="tabular-nums">{formatDate(c.date, locale)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {c.requestedClockIn && `In ${formatTime(c.requestedClockIn, false, locale)}`}
              {c.requestedClockIn && c.requestedClockOut && " · "}
              {c.requestedClockOut && `Out ${formatTime(c.requestedClockOut, false, locale)}`}
            </TableCell>
            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{c.reason}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button size="icon" variant="success" disabled={isPending} onClick={() => review(c.id, "APPROVED")}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="destructive" disabled={isPending} onClick={() => review(c.id, "REJECTED")}>
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
