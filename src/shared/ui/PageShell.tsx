import { cn } from "@/shared/lib/cn";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[var(--content-max)] px-4 py-8 sm:px-6 sm:py-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
