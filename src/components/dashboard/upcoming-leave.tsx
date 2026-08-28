import { CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface UpcomingLeaveItem {
  id: string;
  employeeName: string;
  type: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
}

export function UpcomingLeave({ items, showName = true }: { items: UpcomingLeaveItem[]; showName?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <CalendarRange className="h-6 w-6" />
        <p className="text-sm">No upcoming leave scheduled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div>
            {showName && <p className="text-sm font-medium">{item.employeeName}</p>}
            <p className="text-xs text-muted-foreground">
              {formatDate(item.startDate)} – {formatDate(item.endDate)} · {item.totalDays}d
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {item.type.toLowerCase().replace("_", " ")}
          </Badge>
        </div>
      ))}
    </div>
  );
}
