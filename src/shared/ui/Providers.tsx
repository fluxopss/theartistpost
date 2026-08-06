import { AuthProvider } from "@/features/auth/AuthProvider";
import type { SessionUser } from "@/features/auth/types";

/** Keep the tree light — no global WebGL/Three providers (they crash browsers). */
export function Providers({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  return <AuthProvider initialUser={user}>{children}</AuthProvider>;
}
