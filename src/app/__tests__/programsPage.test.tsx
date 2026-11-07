import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { copy } from "@/content/site";
import ProgramsPage from "@/app/programs/page";

afterEach(() => cleanup());

describe("/programs", () => {
  it("lists every program with a link, and shows no dev placeholders", () => {
    const { container } = render(<ProgramsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Programs" })).toBeInTheDocument();
    for (const program of copy.about.programs) {
      expect(screen.getByRole("link", { name: program.cta })).toHaveAttribute("href", program.href);
    }
    expect(container.textContent).not.toMatch(/TODO|TBD|placeholder/i);
  });
});
