export type SessionUser = {
  id: string;
  name: string;
  email: string;
  handle?: string;
  role: "VIEWER" | "ARTIST" | "ADMIN";
  image?: string | null;
};

/**
 * Pluggable auth surface — swap mockAuthAdapter for NextAuth later.
 * TODO: NextAuth — implement getSession via auth() / getServerSession.
 */
export type AuthAdapter = {
  getSession(): Promise<SessionUser | null>;
};
