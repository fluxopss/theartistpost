import { cn } from "@/shared/lib/cn";

type SectionRevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  id?: string;
};

/** CSS entrance — no Framer on the critical path. */
export function SectionReveal({
  children,
  className,
  delay = 0,
  id,
}: SectionRevealProps) {
  return (
    <div
      id={id}
      className={cn("section-reveal motion-reduce:animate-none", className)}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
