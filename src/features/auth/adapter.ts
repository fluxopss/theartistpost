import { readSessionFromCookie } from "@/features/auth/sessionCookie";
import type { AuthAdapter, SessionUser } from "@/features/auth/types";

/**
 * Signed httpOnly cookie session.
 * Anonymous browse: null. Writes must never treat Studio Guest as signed-in.
 */
export const cookieAuthAdapter: AuthAdapter = {
  async getSession(): Promise<SessionUser | null> {
    return readSessionFromCookie();
  },
};

export const authAdapter: AuthAdapter = cookieAuthAdapter;

export async function getSession() {
  return authAdapter.getSession();
}
