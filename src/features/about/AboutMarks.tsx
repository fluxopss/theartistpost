import Image from "next/image";
import { assets, copy, site } from "@/content/site";
import { SectionReveal } from "@/components/SectionReveal";

const marks = [
  {
    src: assets.logo,
    alt: site.mark,
    plate: "bg-paper",
  },
  {
    src: assets.loveAll,
    alt: "Love | ALL · Dream | TOGETHER · Create | AS ONE™",
    plate: "bg-paper",
  },
  {
    src: assets.kindnessTrademark,
    alt: site.kindnessMark,
    plate: "bg-ink",
  },
] as const;

export function AboutMarks() {
  return (
    <SectionReveal>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-spark-gold">
        {copy.about.marksKicker}
      </p>
      <h2 className="display mt-2 text-3xl text-paper sm:text-4xl">
        {copy.about.marksTitle}
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-paper-muted sm:text-base">
        {copy.about.marksBody}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {marks.map((mark) => (
          <div
            key={mark.src}
            className={`flex min-h-40 items-center justify-center rounded-2xl border border-line px-4 py-6 ${mark.plate}`}
          >
            <Image
              src={mark.src}
              alt={mark.alt}
              width={220}
              height={160}
              className="h-28 w-auto object-contain"
            />
          </div>
        ))}
      </div>
    </SectionReveal>
  );
}
