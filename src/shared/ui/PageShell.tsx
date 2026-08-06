import { cn } from "@/shared/lib/cn";

/** Content padding inside the app frame (no wide desktop max-width). */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return <div className={cn("w-full px-4 py-6", className)}>{children}</div>;
}
