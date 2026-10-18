import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { JoinExperience } from "@/features/auth/JoinExperience";

vi.mock("@/features/auth/actions", () => ({
  registerArtistAction: vi.fn(),
  registerMemberAction: vi.fn(),
  requestSignInCodeAction: vi.fn(),
  verifySignInCodeAction: vi.fn(),
}));

vi.mock("@/features/auth/AuthProvider", () => ({
  useSession: () => ({ user: null, isAuthenticated: false }),
}));

afterEach(() => {
  cleanup();
});

describe("JoinExperience door from ?door=", () => {
  it("opens the requested door on first render", () => {
    render(<JoinExperience initialDoor="member" />);
    expect(screen.getByText("Take a seat in the house")).toBeTruthy();
  });

  it("follows a new ?door= while mounted, but keeps a door the visitor picked otherwise", () => {
    const { rerender } = render(<JoinExperience initialDoor="member" />);

    rerender(<JoinExperience initialDoor="artist" />);
    expect(screen.getByText(/Artist door · step 1 of 3/)).toBeTruthy();

    fireEvent.click(screen.getByText("← All doors"));
    expect(screen.getByText("Three doors · one house")).toBeTruthy();

    // Same prop again: no reset back into the artist door.
    rerender(<JoinExperience initialDoor="artist" />);
    expect(screen.getByText("Three doors · one house")).toBeTruthy();

    // Dropping the param leaves the current door alone.
    rerender(<JoinExperience initialDoor={null} />);
    expect(screen.getByText("Three doors · one house")).toBeTruthy();
  });
});
