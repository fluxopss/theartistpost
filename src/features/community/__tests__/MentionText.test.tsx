import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MentionText } from "../MentionText";

afterEach(cleanup);

describe("MentionText", () => {
  it("links @handles to profiles and keeps the rest as text", () => {
    render(<MentionText body="Thanks @Robbi and @rae!" />);
    expect(screen.getByRole("link", { name: "@Robbi" })).toHaveAttribute("href", "/u/robbi");
    expect(screen.getByRole("link", { name: "@rae" })).toHaveAttribute("href", "/u/rae");
  });

  it("never renders markup from the body", () => {
    const { container } = render(<MentionText body={'<img src=x onerror="alert(1)"> hi'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img");
  });
});
