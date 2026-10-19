import { describe, expect, it } from "vitest";
import { joinHref, safeNextPath } from "../safeNext";

describe("safeNextPath", () => {
  it.each([
    ["/settings/profile", "/settings/profile"],
    ["/u/robbi?tab=posts", "/u/robbi?tab=posts"],
    ["/", "/"],
    ["/explore?q=a%26b", "/explore?q=a%26b"],
  ])("keeps %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "\\/evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "%2F%2Fevil.com",
    "/%2F/evil.com",
    "/join",
    "/join?door=return",
    "/api/v1/me",
    "/api",
    "/settings\n/x",
    "",
    "x".repeat(513),
  ])("refuses %s", (input) => {
    expect(safeNextPath(input)).toBeNull();
  });

  it("only refuses the /join route itself, not paths that start with the word", () => {
    expect(safeNextPath("/joined")).toBe("/joined");
  });

  it("returns a header-safe, percent-encoded path for non-Latin text", () => {
    expect(safeNextPath("/explore?q=日本")).toBe("/explore?q=%E6%97%A5%E6%9C%AC");
  });

  it("does not decode again (Next already decoded searchParams)", () => {
    expect(safeNextPath("%2Fsettings%2Fprofile")).toBeNull();
  });

  it("refuses null and undefined", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });

  it("a malformed percent-encoding never throws and stays on this site", () => {
    expect(() => safeNextPath("/%E0%A4%A")).not.toThrow();
    expect(safeNextPath("/%E0%A4%A")).toMatch(/^\/[^/]/);
  });
});

describe("joinHref", () => {
  it("encodes next for the returning door", () => {
    expect(joinHref("/u/a?b=1")).toBe("/join?door=return&next=%2Fu%2Fa%3Fb%3D1");
  });

  it("drops an unsafe next", () => {
    expect(joinHref("//evil.com")).toBe("/join?door=return");
    expect(joinHref("/join")).toBe("/join?door=return");
  });
});
