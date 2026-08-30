import Image from "next/image";
import Link from "next/link";
import { history } from "@/content/history";
import { assets } from "@/content/site";
import { SectionReveal } from "@/components/SectionReveal";

export function HistoryTeaser() {
  return (
    <SectionReveal>
      <Link
        href="/history"
        className="mx-auto flex max-w-[var(--content-max)] flex-col items-center gap-6 rounded-[2rem] border border-line bg-surface-glass px-5 py-10 text-center sm:flex-row sm:px-8 sm:text-left"
      >
        <Image
          src={assets.logo3d}
          alt=""
          width={160}
          height={162}
          className="h-28 w-28 object-contain drop-shadow-[0_12px_40px_rgba(46,196,182,0.28)] sm:h-32 sm:w-32"
        />
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
            {history.foundedLabel}
          </span>
          <span className="display mt-2 block text-3xl text-paper sm:text-4xl">
            {history.title}
          </span>
          <span className="mt-3 block max-w-xl text-sm leading-relaxed text-paper-muted">
            From a Coast Guard founder’s 2014 post to a 501(c)(3) live room on
            Clematis — the public record, with sources.
          </span>
          <span className="mt-4 inline-block text-sm font-semibold text-spark-teal">
            Read the history
          </span>
        </span>
      </Link>
    </SectionReveal>
  );
}
