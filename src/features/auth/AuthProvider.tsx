"use client";

import { createContext, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOutAction } from "@/features/auth/actions";
import type { SessionUser } from "@/features/auth/types";

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  signingOut: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
}) {
  const router = useRouter();
  const [signingOut, startTransition] = useTransition();

  const value = useMemo<AuthContextValue>(
    () => ({
      user: initialUser,
      isAuthenticated: Boolean(initialUser),
      signIn: () => {
        router.push("/join");
      },
      signOut: () => {
        startTransition(async () => {
          await signOutAction();
          router.refresh();
          router.push("/join");
        });
      },
      signingOut,
    }),
    [initialUser, router, signingOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useSession must be used within AuthProvider");
  }
  return ctx;
}
