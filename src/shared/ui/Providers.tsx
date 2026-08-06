"use client";

import { AuthProvider } from "@/features/auth/AuthProvider";
import { WebGLProvider } from "@/shared/three/WebGLGate";
import type { SessionUser } from "@/features/auth/types";

export function Providers({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  return (
    <AuthProvider initialUser={user}>
      <WebGLProvider>{children}</WebGLProvider>
    </AuthProvider>
  );
}
