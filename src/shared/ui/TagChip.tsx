import Link from "next/link";
import { cn } from "@/shared/lib/cn";

export function TagChip({
  name,
  slug,
  active,
  href,
}: {
  name: string;
  slug: string;
  active?: boolean;
  href?: string;
}) {
  const className = cn(
    "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition",
    active
      ? "bg-spark-teal text-ink"
      : "border border-line bg-surface-glass text-paper-muted hover:text-paper",
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={`Tag ${name}`}>
        {name}
      </Link>
    );
  }

  return <span className={className}>{slug ? name : name}</span>;
}
