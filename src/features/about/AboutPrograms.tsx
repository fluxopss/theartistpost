import Link from "next/link";
import { copy } from "@/content/site";
import { SectionReveal } from "@/components/SectionReveal";

/** What The Artist Post does, as plain program cards. Facts live in content/site.ts. */
export function AboutPrograms({ heading = "h2" }: { heading?: "h1" | "h2" }) {
  const Heading = heading;
  return (
    <SectionReveal>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-teal">
        {copy.about.programsKicker}
      </p>
      <Heading className="display mt-2 text-3xl text-paper sm:text-4xl">
        {copy.about.programsTitle}
      </Heading>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-paper-muted sm:text-base">
        {copy.about.programsLead}
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {copy.about.programs.map((program) => (
          <li
            key={program.title}
            className="flex flex-col rounded-2xl border border-line bg-surface-glass p-5"
          >
            <h3 className="font-semibold text-paper">{program.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-paper-muted">
              {program.body}
            </p>
            <Link
              href={program.href}
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-spark-teal hover:underline"
            >
              {program.cta}
            </Link>
          </li>
        ))}
      </ul>
    </SectionReveal>
  );
}
