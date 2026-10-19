import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/features/auth/types";
import { accountLinks } from "../accountLinks";

const viewer: SessionUser = { id: "u1", name: "Rae Lin", email: "rae@example.com", role: "VIEWER" };

describe("accountLinks", () => {
  it("signed out: sign in (back to this page) and join", () => {
    expect(accountLinks(null, "/u/rae")).toEqual([
      { href: "/join?door=return&next=%2Fu%2Frae", label: "Sign in" },
      { href: "/join", label: "Join" },
    ]);
  });

  it("signed out on /join itself: no next back to /join", () => {
    expect(accountLinks(null, "/join")[0]!.href).toBe("/join?door=return");
  });

  it("signed in with a handle: profile, edit, settings", () => {
    expect(accountLinks({ ...viewer, handle: "rae" }, "/").map((l) => l.label)).toEqual([
      "Your profile",
      "Edit profile",
      "Settings",
    ]);
    expect(accountLinks({ ...viewer, handle: "rae" }, "/")[0]!.href).toBe("/u/rae");
  });

  it("signed in without a handle never links to /u/undefined", () => {
    const links = accountLinks({ ...viewer, handle: undefined }, "/");
    expect(links.map((l) => l.href)).not.toContain("/u/undefined");
    expect(links.map((l) => l.label)).toEqual(["Edit profile", "Settings"]);
  });

  it("artists also get their studio", () => {
    const links = accountLinks({ ...viewer, role: "ARTIST", handle: "rae" }, "/");
    expect(links).toContainEqual({ href: "/create", label: "Your studio" });
  });
});
