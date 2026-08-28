"use client";

import { AlertCircle } from "lucide-react";

export function ForbiddenBanner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
      <AlertCircle className="h-4 w-4 shrink-0" />
      You don&apos;t have permission to access that page. Your view is limited to what your role allows.
    </div>
  );
}
