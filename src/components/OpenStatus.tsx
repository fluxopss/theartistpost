"use client";

import { useOpenStatus } from "@/hooks/useOpenStatus";
import { cn } from "@/shared/lib/cn";

export function OpenStatus({ className }: { className?: string }) {
  const { open, ready, label, hoursLabel } = useOpenStatus();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-surface-glass px-3 py-1.5 text-sm",
        className,
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          !ready && "bg-paper-muted",
          ready && open && "bg-success shadow-[0_0_8px_rgba(61,214,140,0.8)]",
          ready && !open && "bg-spark-coral",
        )}
        aria-hidden
      />
      <span className="font-medium text-paper">
        {ready ? label : "Checking hours…"}
      </span>
      <span className="text-paper-muted">· {hoursLabel}</span>
    </div>
  );
}
