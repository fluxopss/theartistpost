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
    "inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold tracking-wide uppercase transition",
    active
      ? "bg-ink text-paper-on-dark"
      : "bg-accent-soft text-paper-muted hover:text-ink",
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
