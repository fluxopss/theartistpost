import { history } from "@/content/history";
import { SectionReveal } from "@/components/SectionReveal";

function HistoryHeading({ heading }: { heading: "title" | "lead-only" }) {
  switch (heading) {
    case "title":
      return (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            {history.kicker}
          </p>
          <h2 className="display mt-3 text-3xl text-paper sm:text-5xl">
            {history.title}
          </h2>
        </>
      );
    case "lead-only":
      return null;
    default: {
      const _exhaustive: never = heading;
      return _exhaustive;
    }
  }
}

export function AboutHistory({
  heading = "title",
}: {
  heading?: "title" | "lead-only";
}) {
  return (
    <article className="space-y-10">
      <SectionReveal>
        <HistoryHeading heading={heading} />
        <p
          className={`max-w-3xl text-base leading-relaxed text-paper-muted sm:text-lg ${
            heading === "title" ? "mt-5" : ""
          }`}
        >
          {history.lead}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-paper-muted">
          {history.honesty}
        </p>
      </SectionReveal>

      <ol className="relative space-y-0 border-l border-line pl-0">
        {history.eras.map((era) => (
          <li key={era.id} className="relative">
            <SectionReveal className="grid gap-4 border-b border-line py-8 sm:grid-cols-[6.5rem_1fr] sm:gap-8">
              <p className="display text-2xl text-spark-gold sm:pt-1">{era.year}</p>
              <div>
                <h3 className="display text-2xl text-paper sm:text-3xl">
                  {era.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-paper-muted sm:text-base">
                  {era.body}
                </p>
                <ul className="mt-4 space-y-2">
                  {era.facts.map((fact) => (
                    <li
                      key={fact}
                      className="text-xs leading-relaxed text-paper-muted sm:text-sm"
                    >
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            </SectionReveal>
          </li>
        ))}
      </ol>

      <SectionReveal>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
          Sources
        </p>
        <ul className="mt-4 space-y-2">
          {history.sources.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-paper underline decoration-line underline-offset-4 hover:text-spark-teal"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </SectionReveal>
    </article>
  );
}
