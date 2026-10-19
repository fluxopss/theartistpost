import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/more",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/auth/AuthProvider", () => ({
  useSession: () => ({ user: null, isAuthenticated: false, signIn: vi.fn(), signOut: vi.fn(), signingOut: false }),
}));
import { StudioHub } from "@/features/app/StudioHub";
import { InstallApp } from "@/features/app/InstallApp";

const root = path.resolve(__dirname, "../../../..");
afterEach(cleanup);

describe("launch cleanup", () => {
  it("the Studio hub has no tester-only Expo Go link", () => {
    render(<StudioHub />);
    expect(screen.queryAllByText(/Expo Go/i)).toHaveLength(0);
    expect(document.querySelector('a[href="/setup-expo"]')).toBeNull();
  });

  it("the public install page has no tester-only Expo Go link", () => {
    render(<InstallApp />);
    expect(screen.queryAllByText(/Expo Go/i)).toHaveLength(0);
    expect(document.querySelector('a[href="/setup-expo"]')).toBeNull();
  });

  it("the old hide-the-cursor rule is gone from the stylesheet", () => {
    const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
    expect(css).not.toContain("cursor-trail-active");
  });

  it("the repo's Traefik file matches the live certificate setup for .org and www", () => {
    const yml = readFileSync(path.join(root, "deploy/traefik-theartistpost.yml"), "utf8");
    expect(yml).toMatch(/domains:\s*\n\s*- main: theartistpost\.org\s*\n\s*sans:\s*\n\s*- www\.theartistpost\.org/);
  });
});
