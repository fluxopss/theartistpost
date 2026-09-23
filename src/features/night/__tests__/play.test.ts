import { describe, expect, it } from "vitest";
import { floorBeats } from "@/features/night/program";
import {
  clampTearPull,
  floorWalked,
  nextLitRooms,
  tearShouldOpen,
} from "@/features/night/play";

const rooms = floorBeats({ venue: "Hacienda" });

describe("night play", () => {
  it("lights a room and lets you put it back out", () => {
    const once = nextLitRooms([], "doors");
    expect(once).toEqual(["doors"]);
    expect(nextLitRooms(once, "doors")).toEqual([]);
  });

  it("knows when the whole floor is walked", () => {
    expect(floorWalked([], rooms)).toBe(false);
    const all = rooms.map((room) => room.id);
    expect(floorWalked(all, rooms)).toBe(true);
    expect(floorWalked(all.slice(0, 3), rooms)).toBe(false);
  });

  it("tears only after a real pull", () => {
    expect(tearShouldOpen(10)).toBe(false);
    expect(tearShouldOpen(36)).toBe(true);
    expect(clampTearPull(-4)).toBe(0);
    expect(clampTearPull(200)).toBe(84);
  });
});
