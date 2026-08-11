import { cn } from "@/shared/lib/cn";

type SkeletonProps = {
  className?: string;
  /** Accessible label announced while loading */
  label?: string;
};

export function Skeleton({ className, label = "Loading" }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton rounded-md", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-surface-muted",
        className,
      )}
      aria-hidden
    >
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}
