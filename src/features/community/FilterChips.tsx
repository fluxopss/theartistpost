import Link from "next/link";
import { cn } from "@/shared/lib/cn";

/** A row of link chips; the current one is marked. Server-rendered, works without JavaScript. */
export function FilterChips({
  label,
  options,
  value,
  hrefFor,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  hrefFor: (id: string) => string;
}) {
  return (
    <nav aria-label={label} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Link
            key={option.id}
            href={hrefFor(option.id)}
            aria-current={active ? "true" : undefined}
            scroll={false}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm transition",
              active ? "border-spark-teal bg-accent-soft text-spark-teal" : "border-line text-paper-muted hover:text-paper",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
