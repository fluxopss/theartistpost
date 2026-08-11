"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { motion as motionTokens } from "@/design-system/tokens";
import { useReducedMotion } from "@/hooks/useMedia";

export type AccordionItem = {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  content: React.ReactNode;
};

type AccordionProps = {
  items: AccordionItem[];
  defaultOpenId?: string | null;
  className?: string;
  allowMultiple?: boolean;
};

export function Accordion({
  items,
  defaultOpenId = null,
  className,
  allowMultiple = false,
}: AccordionProps) {
  const baseId = useId();
  const reduce = useReducedMotion();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [openIds, setOpenIds] = useState<string[]>(
    defaultOpenId ? [defaultOpenId] : [],
  );

  function toggle(id: string) {
    setOpenIds((prev) => {
      const isOpen = prev.includes(id);
      if (allowMultiple) {
        return isOpen ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return isOpen ? [] : [id];
    });
  }

  function focusHeader(index: number) {
    const el = buttonRefs.current[index];
    el?.focus();
  }

  function onHeaderKeyDown(e: React.KeyboardEvent, index: number) {
    const last = items.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusHeader(index === last ? 0 : index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusHeader(index === 0 ? last : index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusHeader(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusHeader(last);
    }
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const open = openIds.includes(item.id);
        const panelId = `${baseId}-${item.id}-panel`;
        const buttonId = `${baseId}-${item.id}-button`;
        return (
          <li
            key={item.id}
            className="overflow-hidden rounded-2xl border border-line bg-surface-glass"
          >
            <h3>
              <button
                type="button"
                id={buttonId}
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                className="flex min-h-11 w-full items-start justify-between gap-3 px-4 py-4 text-left sm:px-5"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                onKeyDown={(e) => onHeaderKeyDown(e, index)}
              >
                <span className="min-w-0 flex-1">
                  {item.title}
                  {item.subtitle ? (
                    <span className="mt-1 block text-sm text-paper-muted">
                      {item.subtitle}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    "mt-1 h-5 w-5 shrink-0 text-paper-muted transition",
                    open && "rotate-180 text-spark-teal",
                  )}
                  aria-hidden
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: motionTokens.duration.med }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-line px-4 pb-5 pt-3 sm:px-5">
                    {item.content}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
