import type { EventDTO } from "@/server/api/dto";
import { cn } from "@/shared/lib/cn";

/** Sponsor links leave the site, open in a new tab, and are marked as paid. */
export const SPONSOR_REL = "sponsored noopener noreferrer";

type Sponsor = NonNullable<EventDTO["presentedBy"]>;

/**
 * "Presented by <name>" — the plain disclosure on a sponsored night.
 * Renders nothing for a night without a sponsor, so unsponsored nights carry
 * no sponsor wording at all.
 */
export function PresentedBy({
  sponsor,
  size = "md",
  className,
}: {
  sponsor: Sponsor | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!sponsor) return null;
  const logo = sponsor.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- upload URL on our own origin
    <img
      src={sponsor.logoUrl}
      alt=""
      className={cn(
        "rounded-md bg-paper/90 object-contain p-0.5",
        size === "sm" ? "h-5 w-5" : "h-8 w-8",
      )}
    />
  ) : null;
  const name = sponsor.url ? (
    <a
      href={sponsor.url}
      target="_blank"
      rel={SPONSOR_REL}
      className="inline-flex items-center gap-2 font-semibold text-paper underline-offset-4 hover:text-spark-teal hover:underline"
    >
      {logo}
      {sponsor.name}
    </a>
  ) : (
    <span className="inline-flex items-center gap-2 font-semibold text-paper">
      {logo}
      {sponsor.name}
    </span>
  );

  return (
    <p
      data-testid="presented-by"
      className={cn(
        "flex flex-wrap items-center gap-2 text-paper-muted",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
    >
      <span>Presented by</span> {name}
    </p>
  );
}
