"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Mount children only when near viewport — keeps below-fold JS off the LCP path. */
export function LazyWhenVisible({
  children,
  rootMargin = "0px 0px -12% 0px",
  minHeight = 280,
  className,
}: {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, visible]);

  return (
    <div
      ref={ref}
      className={className}
      style={visible ? undefined : { minHeight }}
    >
      {visible ? children : null}
    </div>
  );
}
