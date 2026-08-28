import { MOCK_SESSION_USER } from "@/features/auth/mock-user";
import type { AuthAdapter, SessionUser } from "@/features/auth/types";

/**
 * Device studio session for Create in v1.
 * TODO: NextAuth — replace body with a real session lookup.
 */
export const mockAuthAdapter: AuthAdapter = {
  async getSession(): Promise<SessionUser | null> {
    return MOCK_SESSION_USER;
  },
};

export const authAdapter: AuthAdapter = mockAuthAdapter;

export async function getSession() {
  return authAdapter.getSession();
}
