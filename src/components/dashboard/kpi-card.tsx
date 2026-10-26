import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = "primary",
  valueClassName,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "danger";
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            accent === "primary" && "bg-primary/15 text-petrol",
            accent === "success" && "bg-success/10 text-success",
            accent === "warning" && "bg-warning/10 text-warning",
            accent === "danger" && "bg-danger/10 text-danger"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-4 text-3xl font-semibold tracking-tight text-foreground", valueClassName)}>{value}</p>
      {sublabel && <p className="mt-1.5 text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}
