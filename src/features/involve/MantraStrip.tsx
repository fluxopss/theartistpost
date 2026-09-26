import { mantra } from "@/content/site";
import { cn } from "@/shared/lib/cn";

const lineTone = ["text-spark-coral", "text-spark-gold", "text-spark-teal"] as const;

export function MantraStrip({ className }: { className?: string }) {
  return (
    <section
      aria-label="The Artist Post mantra"
      className={cn(
        "border-y border-line bg-[color-mix(in_srgb,var(--spark-teal)_6%,var(--surface-muted))]",
        className,
      )}
    >
      <div className="mantra-rail">
        {mantra.map((line, i) => (
          <p
            key={line.rest}
            className="mantra-card"
            style={{ ["--tilt" as string]: ["-1.2deg", "0.8deg", "-0.6deg"][i] }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-paper-muted">
              {line.lead}
            </span>
            <span
              className={cn(
                "display mt-2 block text-2xl sm:text-3xl",
                lineTone[i] ?? "text-paper",
              )}
            >
              {line.rest}
              {"mark" in line ? (
                <sup className="ml-1 align-super text-sm text-spark-gold">
                  {line.mark}
                </sup>
              ) : null}
            </span>
          </p>
        ))}
      </div>
    </section>
  );
}
