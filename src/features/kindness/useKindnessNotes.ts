"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { kindnessSeeds } from "./fixtures";
import {
  KINDNESS_ANON,
  KINDNESS_LOCAL_CAP,
  KINDNESS_MAX_BODY,
  KINDNESS_STORAGE_KEY,
  type KindnessMedium,
  type KindnessNote,
  type KindnessSpark,
} from "./types";

function readLocal(): KindnessNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KINDNESS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KindnessNote[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n) =>
        n &&
        typeof n.id === "string" &&
        typeof n.body === "string" &&
        n.source === "local",
    );
  } catch {
    return [];
  }
}

function writeLocal(notes: KindnessNote[]): { ok: boolean; error?: string } {
  try {
    window.localStorage.setItem(KINDNESS_STORAGE_KEY, JSON.stringify(notes));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Couldn’t save to this device — your note is here for now.",
    };
  }
}

function mergeNotes(local: KindnessNote[]): KindnessNote[] {
  return [...local, ...kindnessSeeds].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export type AddKindnessInput = {
  body: string;
  fromLabel?: string;
  medium: KindnessMedium;
  spark: KindnessSpark;
};

export function useKindnessNotes() {
  const [local, setLocal] = useState<KindnessNote[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    setLocal(readLocal());
    setHydrated(true);
  }, []);

  const notes = useMemo(() => mergeNotes(local), [local]);

  const addNote = useCallback((input: AddKindnessInput) => {
    const body = input.body.trim().slice(0, KINDNESS_MAX_BODY);
    if (!body) {
      return { ok: false as const, error: "Write a few kind words first." };
    }

    const note: KindnessNote = {
      id: crypto.randomUUID(),
      body,
      fromLabel: (input.fromLabel?.trim() || KINDNESS_ANON).slice(0, 48),
      medium: input.medium,
      spark: input.spark,
      createdAt: new Date().toISOString(),
      source: "local",
    };

    setLocal((prev) => {
      const next = [note, ...prev].slice(0, KINDNESS_LOCAL_CAP);
      const result = writeLocal(next);
      if (!result.ok) {
        setStorageError(result.error ?? "Save failed");
      } else {
        setStorageError(null);
      }
      return next;
    });

    return { ok: true as const, note };
  }, []);

  const clearStorageError = useCallback(() => setStorageError(null), []);

  return {
    notes,
    localCount: local.length,
    hydrated,
    storageError,
    clearStorageError,
    addNote,
  };
}
