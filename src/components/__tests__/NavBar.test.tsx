import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NavBar } from "@/components/NavBar";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  pathname = "/";
  document.body.style.overflow = "";
});

describe("NavBar mobile sheet", () => {
  it("opens, locks scroll, and closes when the route changes", () => {
    const { rerender } = render(<NavBar />);
    expect(screen.queryByRole("dialog", { name: "Mobile navigation" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog", { name: "Mobile navigation" })).toBeTruthy();
    expect(document.body.style.overflow).toBe("hidden");

    pathname = "/explore";
    rerender(<NavBar />);
    expect(screen.queryByRole("dialog", { name: "Mobile navigation" })).toBeNull();
    expect(document.body.style.overflow).toBe("");

    // Opening again works on the new route.
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog", { name: "Mobile navigation" })).toBeTruthy();
  });

  it("toggles closed from the header button", () => {
    render(<NavBar />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Close menu" })[0]!);
    expect(screen.queryByRole("dialog", { name: "Mobile navigation" })).toBeNull();
  });
});
