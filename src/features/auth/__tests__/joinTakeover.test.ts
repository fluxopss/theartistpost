import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  artistProfile: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
};

const writeSessionCookie = vi.fn(async () => true);

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => db,
}));

vi.mock("@/features/auth/sessionCookie", () => ({
  writeSessionCookie: (...args: unknown[]) => writeSessionCookie(...(args as [])),
  clearSessionCookie: vi.fn(async () => undefined),
}));

const { registerArtistAction, registerMemberAction } = await import(
  "@/features/auth/actions"
);

const existingUser = (role: "VIEWER" | "ARTIST" | "ADMIN") => ({
  id: `user_${role.toLowerCase()}`,
  email: `${role.toLowerCase()}@example.com`,
  name: "Existing Person",
  image: null,
  role,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const artistInput = (email: string, handle: string) => ({
  name: "Someone Else",
  email,
  handle,
  medium: "Musicians",
  intent: "I want to hang sound in the house.",
});

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue(null);
  db.artistProfile.findUnique.mockResolvedValue(null);
  db.auditLog.create.mockResolvedValue({});
});

describe("member door never opens an existing account", () => {
  it.each(["VIEWER", "ARTIST", "ADMIN"] as const)(
    "refuses an existing %s email without a session or rename",
    async (role) => {
      db.user.findUnique.mockResolvedValue(existingUser(role));

      const result = await registerMemberAction({
        name: "Attacker Name",
        email: `${role.toLowerCase()}@example.com`,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/already joined/i);
      expect(db.user.update).not.toHaveBeenCalled();
      expect(db.user.create).not.toHaveBeenCalled();
      expect(writeSessionCookie).not.toHaveBeenCalled();
    },
  );

  it("still opens the door for a brand-new email", async () => {
    db.user.create.mockResolvedValue({
      ...existingUser("VIEWER"),
      id: "user_new",
      email: "new.member@example.com",
      name: "New Member",
    });

    const result = await registerMemberAction({
      name: "New Member",
      email: "new.member@example.com",
    });

    expect(result.ok).toBe(true);
    expect(db.user.create).toHaveBeenCalledWith({
      data: { email: "new.member@example.com", name: "New Member", role: "VIEWER" },
    });
    expect(writeSessionCookie).toHaveBeenCalledTimes(1);
  });
});

describe("artist door never touches an existing account", () => {
  it.each(["VIEWER", "ADMIN"] as const)(
    "refuses an existing %s email without changing role or issuing a session",
    async (role) => {
      db.user.findUnique.mockResolvedValue(existingUser(role));

      const result = await registerArtistAction(
        artistInput(`${role.toLowerCase()}@example.com`, `fresh${role.toLowerCase()}`),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/already joined/i);
      expect(db.user.update).not.toHaveBeenCalled();
      expect(db.user.create).not.toHaveBeenCalled();
      expect(writeSessionCookie).not.toHaveBeenCalled();
    },
  );

  it("refuses a handle that already belongs to someone", async () => {
    db.artistProfile.findUnique.mockResolvedValue({ id: "ap1", userId: "user_other" });

    const result = await registerArtistAction(
      artistInput("brand.new@example.com", "takenhandle"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/handle is already taken/i);
    expect(db.user.create).not.toHaveBeenCalled();
    expect(writeSessionCookie).not.toHaveBeenCalled();
  });

  it("creates a pending artist for a brand-new email", async () => {
    db.user.create.mockResolvedValue({
      ...existingUser("ARTIST"),
      id: "user_artist_new",
      email: "fresh.artist@example.com",
      artistProfile: { id: "ap_new", approved: false },
    });

    const result = await registerArtistAction(
      artistInput("fresh.artist@example.com", "freshartist"),
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pendingApproval).toBe(true);
    const created = db.user.create.mock.calls[0]?.[0];
    expect(created?.data.role).toBe("ARTIST");
    expect(created?.data.artistProfile.create.approved).toBe(false);
    expect(writeSessionCookie).toHaveBeenCalledTimes(1);
  });
});
