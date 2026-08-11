"use client";

import { useId } from "react";
import { cn } from "@/shared/lib/cn";

export type TabItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
};

export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const baseId = useId();

  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-line bg-surface-glass p-1",
        className,
      )}
      role="tablist"
      aria-label={label}
    >
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition",
              selected
                ? "bg-spark-teal !text-[#020b1a]"
                : "text-paper-muted hover:text-paper",
            )}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => {
              const idx = items.findIndex((t) => t.id === value);
              if (e.key === "ArrowRight") {
                e.preventDefault();
                onChange(items[(idx + 1) % items.length]!.id);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                onChange(items[(idx - 1 + items.length) % items.length]!.id);
              }
            }}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
