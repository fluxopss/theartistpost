"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { WEBGL_DEFAULT } from "@/shared/lib/constants";

type WebGLContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  supported: boolean;
};

const WebGLContext = createContext<WebGLContextValue | null>(null);

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

function getSnapshot(): { supported: boolean; enabled: boolean } {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supported = detectWebGL() && !reduce;
  const stored = window.localStorage.getItem("tap-webgl");
  let enabled = WEBGL_DEFAULT && supported;
  if (stored === "true") enabled = supported;
  if (stored === "false") enabled = false;
  return { supported, enabled };
}

function getServerSnapshot(): { supported: boolean; enabled: boolean } {
  return { supported: false, enabled: false };
}

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("tap-webgl-change", onStoreChange);
  return () => {
    mq.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("tap-webgl-change", onStoreChange);
  };
}

export function WebGLProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setEnabled = useCallback((value: boolean) => {
    const supported = detectWebGL();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const next = value && supported && !reduce;
    window.localStorage.setItem("tap-webgl", String(next));
    window.dispatchEvent(new Event("tap-webgl-change"));
  }, []);

  const value = useMemo(
    () => ({
      enabled: state.enabled,
      setEnabled,
      supported: state.supported,
    }),
    [state.enabled, state.supported, setEnabled],
  );

  return (
    <WebGLContext.Provider value={value}>{children}</WebGLContext.Provider>
  );
}

export function useWebGLEnabled() {
  const ctx = useContext(WebGLContext);
  if (!ctx) {
    throw new Error("useWebGLEnabled must be used within WebGLProvider");
  }
  return ctx;
}

/** Renders children only when WebGL is enabled; otherwise renders fallback. */
export function WebGLGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const { enabled } = useWebGLEnabled();
  return <>{enabled ? children : fallback}</>;
}
