"use client";

import {
  useCallback,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from "react";

const subscribeNever = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards (and on any
 * client-only mount). Lets components read browser-only state during render
 * without a mount effect and without a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/**
 * Local state seeded from browser storage (localStorage, sessionStorage, …).
 *
 * Returns `fallback` on the server and during hydration, then `read()` once
 * hydrated, and re-reads whenever `key` changes — the "adjust state when a
 * prop changes" pattern from the React docs, instead of a setState-in-effect.
 * The setter works like a normal useState setter after that.
 */
export function useHydratedState<T>(
  key: string,
  read: () => T,
  fallback: T,
): [T, (next: SetStateAction<T>) => void] {
  const hydrated = useHydrated();
  const source = hydrated ? key : null;
  const [state, setState] = useState<{ source: string | null; value: T }>({
    source: null,
    value: fallback,
  });

  let value = state.value;
  if (state.source !== source) {
    value = source === null ? fallback : read();
    setState({ source, value });
  }

  const set = useCallback((next: SetStateAction<T>) => {
    setState((prev) => ({
      source: prev.source,
      value:
        typeof next === "function"
          ? (next as (current: T) => T)(prev.value)
          : next,
    }));
  }, []);

  return [value, set];
}
