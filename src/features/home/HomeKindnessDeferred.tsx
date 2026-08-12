"use client";

import dynamic from "next/dynamic";
import { LazyWhenVisible } from "@/components/LazyWhenVisible";

const KindnessBridge = dynamic(
  () =>
    import("@/features/home/KindnessBridge").then((m) => ({
      default: m.KindnessBridge,
    })),
  { ssr: false },
);

export function HomeKindnessDeferred() {
  return (
    <LazyWhenVisible minHeight={420}>
      <KindnessBridge />
    </LazyWhenVisible>
  );
}
