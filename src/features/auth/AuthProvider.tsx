"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { MOCK_SESSION_USER } from "@/features/auth/mock-user";
import type { SessionUser } from "@/features/auth/types";

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  /** TODO: NextAuth — wire real sign-in / sign-out */
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = MOCK_SESSION_USER,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
}) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: initialUser,
      isAuthenticated: Boolean(initialUser),
      signIn: () => {
        // TODO: NextAuth — redirect to provider sign-in
        console.info("[auth] signIn stub — wire NextAuth");
      },
      signOut: () => {
        // TODO: NextAuth — call signOut()
        console.info("[auth] signOut stub — wire NextAuth");
      },
    }),
    [initialUser],
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
