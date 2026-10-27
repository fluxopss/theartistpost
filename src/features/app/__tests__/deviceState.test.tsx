import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SaveEventButton, SavePostButton } from "@/features/app/SaveButton";
import { SavedView } from "@/features/app/SavedView";
import { isPostSaved, toggleSavedEvent, toggleSavedPost } from "@/features/app/storage";

const post = { id: "p1", slug: "first-work", title: "First Work", artist: "Ana" };
const event = { id: "e1", title: "Open Mic", venue: "Hacienda", start: "" };

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("SaveButton", () => {
  it("renders unsaved on the server even when the device has it saved", () => {
    toggleSavedPost(post);
    expect(renderToString(<SavePostButton post={post} />)).toContain("Save");
    expect(renderToString(<SavePostButton post={post} />)).not.toContain("Saved");
  });

  it("reads the device state, toggles it, and re-reads when the post changes", () => {
    toggleSavedPost(post);
    const { rerender } = render(<SavePostButton post={post} />);
    expect(screen.getByRole("button", { name: "Saved" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(isPostSaved(post.id)).toBe(false);

    toggleSavedPost({ ...post, id: "p2" });
    rerender(<SavePostButton post={{ ...post, id: "p2" }} />);
    expect(screen.getByRole("button", { name: "Saved" })).toBeTruthy();
  });

  it("tracks saved nights the same way", () => {
    render(<SaveEventButton event={event} />);
    fireEvent.click(screen.getByRole("button", { name: "Save this night" }));
    expect(screen.getByRole("button", { name: "Saved on this device" })).toBeTruthy();
  });
});

describe("SavedView", () => {
  it("is empty on the server and lists device saves on the client", () => {
    toggleSavedPost(post);
    toggleSavedEvent(event);
    expect(renderToString(<SavedView />)).toContain("Nothing saved yet");

    render(<SavedView />);
    expect(screen.getByText("First Work")).toBeTruthy();
    expect(screen.getByText("Open Mic")).toBeTruthy();
    expect(screen.queryByText(/Nothing saved yet/)).toBeNull();
  });
});
