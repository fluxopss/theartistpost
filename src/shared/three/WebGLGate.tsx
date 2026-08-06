"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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

/** Cache once — never create a new WebGL context per React snapshot. */
let cachedSupport: boolean | null = null;

function detectWebGLOnce(): boolean {
  if (typeof window === "undefined") return false;
  if (cachedSupport !== null) return cachedSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext("experimental-webgl");
    cachedSupport = Boolean(gl);
    // Drop the context immediately so we don't leak GPU contexts.
    if (gl && "getExtension" in gl) {
      const ext = (
        gl as WebGLRenderingContext
      ).getExtension("WEBGL_lose_context");
      ext?.loseContext();
    }
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}

function getSnapshot(): { supported: boolean; enabled: boolean } {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supported = detectWebGLOnce() && !reduce;
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
  const ready = useRef(true);

  const setEnabled = useCallback((value: boolean) => {
    const supported = detectWebGLOnce();
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

  if (!ready.current) return children;

  return (
    <WebGLContext.Provider value={value}>{children}</WebGLContext.Provider>
  );
}

export function useWebGLEnabled() {
  return useContext(WebGLContext);
}

/** Safe without provider — always falls back (marketing site default). */
export function WebGLGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const ctx = useWebGLEnabled();
  if (!ctx?.enabled) return <>{fallback}</>;
  return <>{children}</>;
}
