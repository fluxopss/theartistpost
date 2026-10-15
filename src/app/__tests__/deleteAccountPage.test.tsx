import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { site } from "@/content/site";
import DeleteAccountPage from "@/app/delete-account/page";

describe("delete account page", () => {
  it("renders the heading, the in-app steps and the support address", () => {
    render(<DeleteAccountPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Delete your account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Delete account")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: site.email }),
    ).toHaveAttribute("href", `mailto:${site.email}`);
  });
});
