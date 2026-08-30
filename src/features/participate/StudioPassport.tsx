"use client";

import { useState, useSyncExternalStore } from "react";
import {
  DEFAULT_STUDIO,
  getStudio,
  setStudio,
  type StudioProfile,
} from "@/features/app/storage";
import { Button } from "@/shared/ui/Button";

function subscribeStudio() {
  return () => undefined;
}

/** Lightweight local studio — repeatable participation until native accounts. */
export function StudioPassport() {
  const stored = useSyncExternalStore(
    subscribeStudio,
    getStudio,
    () => DEFAULT_STUDIO,
  );
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const current = profile ?? stored;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next = setStudio({
      displayName: String(data.get("displayName") ?? ""),
      city: String(data.get("city") ?? ""),
    });
    setProfile(next);
    setSaved(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-2xl border border-line bg-ink/25 p-5"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-spark-gold">
        Studio passport
      </p>
      <h3 className="display mt-2 text-xl text-paper">Keep your name in this house</h3>
      <p className="mt-2 text-sm text-paper-muted">
        Saved on this device until artist accounts open. Robbie still reads the
        inquiry below — this just lets you return without starting from blank.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-paper-muted">How we call you</span>
          <input
            name="displayName"
            defaultValue={current.displayName}
            maxLength={40}
            className="min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm outline-none focus:border-spark-teal"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-paper-muted">City</span>
          <input
            name="city"
            defaultValue={current.city ?? ""}
            maxLength={80}
            className="min-h-12 w-full rounded-full border border-line bg-surface-glass px-5 text-sm outline-none focus:border-spark-teal"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" className="rounded-full" variant="outline">
          Remember this studio
        </Button>
        {saved ? (
          <p className="text-sm text-success" role="status">
            Held on this device as @{current.handle}.
          </p>
        ) : (
          <p className="text-sm text-paper-muted">@{current.handle}</p>
        )}
      </div>
    </form>
  );
}
