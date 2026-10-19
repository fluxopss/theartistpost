import { describe, expect, it } from "vitest";
import { tokenizeMentions } from "../mentions";

describe("tokenizeMentions", () => {
  it("returns plain text as one text token", () => {
    expect(tokenizeMentions("Huge love to the whole house")).toEqual([
      { type: "text", value: "Huge love to the whole house" },
    ]);
  });

  it("splits out @handles and keeps the surrounding text exactly", () => {
    expect(tokenizeMentions("Thanks @Robbi for Friday, and @jo_e-1!")).toEqual([
      { type: "text", value: "Thanks " },
      { type: "mention", value: "@Robbi", handle: "robbi" },
      { type: "text", value: " for Friday, and " },
      { type: "mention", value: "@jo_e-1", handle: "jo_e-1" },
      { type: "text", value: "!" },
    ]);
  });

  it("matches a mention at the very start and on a new line", () => {
    const tokens = tokenizeMentions("@aa hello\n@bb");
    expect(tokens.filter((t) => t.type === "mention").map((t) => t.type === "mention" && t.handle)).toEqual([
      "aa",
      "bb",
    ]);
    expect(tokens.map((t) => t.value).join("")).toBe("@aa hello\n@bb");
  });

  it("ignores emails, single-character handles and bare @", () => {
    expect(tokenizeMentions("mail me at a@b.com, @x or @")).toEqual([
      { type: "text", value: "mail me at a@b.com, @x or @" },
    ]);
  });

  it("only links the first five mentions, like the server notifies", () => {
    const body = "@aa @bb @cc @dd @ee @ff";
    const mentions = tokenizeMentions(body).filter((t) => t.type === "mention");
    expect(mentions).toHaveLength(5);
    expect(tokenizeMentions(body).map((t) => t.value).join("")).toBe(body);
  });

  it("never loses text", () => {
    const body = "(@aa) and (@bb), ok? @cc.";
    expect(tokenizeMentions(body).map((t) => t.value).join("")).toBe(body);
  });
});
