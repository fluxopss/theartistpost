import { PageShell } from "@/shared/ui/PageShell";

export function LegalLayout({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PageShell className="max-w-2xl !pt-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-coral">
        {kicker}
      </p>
      <h1 className="display mt-3 text-4xl text-paper">{title}</h1>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-paper-muted [&_h2]:display [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:text-paper [&_a]:text-spark-teal [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </PageShell>
  );
}
