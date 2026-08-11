import { cn } from "@/shared/lib/cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article" | "section" | "li";
  interactive?: boolean;
};

export function Card({
  children,
  className,
  as: Tag = "div",
  interactive,
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-line bg-surface-glass",
        interactive &&
          "transition hover:border-line-strong hover:bg-surface-hover",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
