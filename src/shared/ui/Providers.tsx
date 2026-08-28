"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/features/auth/AuthProvider";
import type { SessionUser } from "@/features/auth/types";
import { ToastProvider } from "@/design-system/primitives/Toast";
import { applyMotionPreference } from "@/features/app/storage";

/** Keep the tree light — no global WebGL/Three providers (they crash browsers). */
export function Providers({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  useEffect(() => {
    applyMotionPreference();
  }, []);

  return (
    <AuthProvider initialUser={user}>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
