"use client";

import dynamic from "next/dynamic";
import { LazyWhenVisible } from "@/components/LazyWhenVisible";

const AmbientKindness = dynamic(
  () =>
    import("@/features/kindness/AmbientKindness").then((m) => ({
      default: m.AmbientKindness,
    })),
  { ssr: false },
);

export function HomeKindnessDeferred() {
  return (
    <LazyWhenVisible minHeight={420}>
      <AmbientKindness />
    </LazyWhenVisible>
  );
}
