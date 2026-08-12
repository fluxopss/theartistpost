"use client";

import dynamic from "next/dynamic";
import type { KindnessNote } from "./types";
import { Skeleton } from "@/design-system/primitives/Skeleton";

const KindnessPhysicsField = dynamic(
  () =>
    import("./KindnessPhysicsField").then((m) => ({
      default: m.KindnessPhysicsField,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="mt-8 h-[min(70vh,640px)] w-full rounded-3xl" />,
  },
);

export function KindnessPhysicsLazy({
  notes,
  onSelect,
}: {
  notes: KindnessNote[];
  onSelect: (note: KindnessNote) => void;
}) {
  return <KindnessPhysicsField notes={notes} onSelect={onSelect} />;
}
