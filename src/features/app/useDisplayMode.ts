"use client";

import { useSyncExternalStore } from "react";

const STANDALONE = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const mq = window.matchMedia(STANDALONE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const subscribeNever = () => () => {};

export function useStandalone(): boolean {
  return useSyncExternalStore(
    subscribeStandalone,
    () => {
      const display = window.matchMedia(STANDALONE).matches;
      const ios = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      return display || ios;
    },
    () => false,
  );
}

export function useIosDevice(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => /iphone|ipad|ipod/i.test(navigator.userAgent),
    () => false,
  );
}
