import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { site } from "@/content/site";

vi.mock("@/features/auth/adapter", () => ({ getSession: async () => null }));

import DeleteAccountPage from "@/app/delete-account/page";

describe("delete account page", () => {
  it("renders the heading, the in-app steps and the support address", async () => {
    render(await DeleteAccountPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Delete your account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Delete account")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: site.email }),
    ).toHaveAttribute("href", `mailto:${site.email}`);
  });
});
