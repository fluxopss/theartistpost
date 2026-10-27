"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribeMedia(queries: string[], onChange: () => void) {
  const lists = queries.map((query) => window.matchMedia(query));
  lists.forEach((mq) => mq.addEventListener("change", onChange));
  return () => lists.forEach((mq) => mq.removeEventListener("change", onChange));
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const TOUCH_QUERIES = ["(pointer: coarse)", "(hover: none)"];

const subscribeReducedMotion = (onChange: () => void) =>
  subscribeMedia([REDUCED_MOTION], onChange);
const subscribeTouch = (onChange: () => void) =>
  subscribeMedia(TOUCH_QUERIES, onChange);

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Defaults to touch (mobile-first) so desktop-only effects do not load on first paint. */
export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(
    subscribeTouch,
    () => TOUCH_QUERIES.some((query) => window.matchMedia(query).matches),
    () => true,
  );
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => subscribeMedia([query], onChange),
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
