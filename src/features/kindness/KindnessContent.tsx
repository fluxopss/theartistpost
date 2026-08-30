"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { KindnessHero } from "./KindnessHero";
import { KindnessWall } from "./KindnessWall";
import { useKindnessNotes } from "./useKindnessNotes";
import { LazyWhenVisible } from "@/components/LazyWhenVisible";

const KindnessCompose = dynamic(
  () =>
    import("./KindnessCompose").then((m) => ({ default: m.KindnessCompose })),
  { ssr: false },
);

const KindnessMerchSection = dynamic(
  () =>
    import("./KindnessMerchSection").then((m) => ({
      default: m.KindnessMerchSection,
    })),
  { ssr: false },
);

export function KindnessContent() {
  const { notes, hydrated, storageError, clearStorageError, addNote } =
    useKindnessNotes();
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <div className="space-y-14">
      <KindnessHero
        onLeaveNote={() => setComposeOpen(true)}
        noteCount={hydrated ? notes.length : 0}
      />

      {storageError ? (
        <p
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="status"
        >
          {storageError}{" "}
          <button
            type="button"
            className="underline"
            onClick={clearStorageError}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      <KindnessWall notes={notes} hydrated={hydrated} />

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="text-sm font-semibold text-spark-teal underline-offset-4 hover:underline"
        >
          Leave another spark
        </button>
      </div>

      <LazyWhenVisible minHeight={320}>
        <KindnessMerchSection />
      </LazyWhenVisible>

      {composeOpen ? (
        <KindnessCompose
          open={composeOpen}
          onOpenChange={setComposeOpen}
          onSubmit={addNote}
        />
      ) : null}
    </div>
  );
}
