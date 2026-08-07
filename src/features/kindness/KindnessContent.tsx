"use client";

import { useState } from "react";
import { KindnessCompose } from "./KindnessCompose";
import { KindnessHero } from "./KindnessHero";
import { KindnessMerchSection } from "./KindnessMerchSection";
import { KindnessWall } from "./KindnessWall";
import { useKindnessNotes } from "./useKindnessNotes";

export function KindnessContent() {
  const { notes, hydrated, storageError, clearStorageError, addNote } =
    useKindnessNotes();
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <div className="space-y-14">
      <KindnessHero onLeaveNote={() => setComposeOpen(true)} />

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

      <KindnessMerchSection />

      <KindnessCompose
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSubmit={addNote}
      />
    </div>
  );
}
