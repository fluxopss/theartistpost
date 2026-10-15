"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useHydrated } from "@/hooks/useHydrated";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "tap-theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
}

const listeners = new Set<() => void>();

function subscribeTheme(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getStoredTheme,
    () => "dark" as const,
  );
  const mounted = useHydrated();

  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  function setTheme(next: ThemeMode) {
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    listeners.forEach((listener) => listener());
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return { theme, setTheme, toggleTheme, mounted };
}
