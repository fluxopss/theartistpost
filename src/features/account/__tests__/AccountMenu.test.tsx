import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/features/auth/types";

let currentUser: SessionUser | null = null;
const signOut = vi.fn();

vi.mock("next/navigation", () => ({ usePathname: () => "/explore" }));
vi.mock("@/features/auth/AuthProvider", () => ({
  useSession: () => ({ user: currentUser, isAuthenticated: Boolean(currentUser), signOut, signingOut: false, signIn: vi.fn() }),
}));

import { AccountMenu } from "../AccountMenu";

afterEach(cleanup);

beforeEach(() => {
  currentUser = null;
  signOut.mockReset();
});

describe("AccountMenu", () => {
  it("signed out shows Sign in that returns to this page", () => {
    render(<AccountMenu />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/join?door=return&next=%2Fexplore");
  });

  it("signed in shows initials, opens a menu and signs out", async () => {
    currentUser = { id: "u1", name: "Rae Lin", email: "rae@example.com", role: "VIEWER", handle: "rae" };
    render(<AccountMenu />);
    const button = screen.getByRole("button", { name: /account menu/i });
    expect(button).toHaveTextContent("RL");
    expect(button).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Your profile" })).toHaveAttribute("href", "/u/rae");

    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("Escape closes the menu", async () => {
    currentUser = { id: "u1", name: "Rae", email: "rae@example.com", role: "VIEWER" };
    render(<AccountMenu />);
    const button = screen.getByRole("button", { name: /account menu/i });
    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows the profile photo when there is one", () => {
    currentUser = { id: "u1", name: "Rae", email: "rae@example.com", role: "VIEWER", image: "/uploads/rae.jpg" };
    render(<AccountMenu />);
    expect(screen.getByRole("button", { name: /account menu/i }).querySelector("img")).toHaveAttribute("src", "/uploads/rae.jpg");
  });

  it("signed out keeps its pill layout when the header hides it on phones", () => {
    render(<AccountMenu className="hidden sm:block" />);
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link.className).toContain("inline-flex");
    expect(link.className).toContain("items-center");
    expect(link.parentElement?.className).toContain("sm:block");
  });
});
