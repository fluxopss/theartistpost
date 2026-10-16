// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildPaymentLinks,
  parsePaymentUsername,
  type PaymentLinkSource,
} from "@/server/api/paymentLinks";

function ok(service: Parameters<typeof parsePaymentUsername>[0], raw: string) {
  const result = parsePaymentUsername(service, raw);
  if (!result.ok) throw new Error(`expected ok, got: ${result.message}`);
  return result.value;
}

function bad(service: Parameters<typeof parsePaymentUsername>[0], raw: string) {
  const result = parsePaymentUsername(service, raw);
  if (result.ok) throw new Error(`expected failure, got: ${result.value}`);
  return result.message;
}

describe("parsePaymentUsername: shared cleaning", () => {
  it("treats an empty or blank string as clearing the field", () => {
    expect(ok("venmo", "")).toBeNull();
    expect(ok("cashapp", "   ")).toBeNull();
    expect(ok("paypalme", "")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(ok("venmo", "  robbie-art  ")).toBe("robbie-art");
  });

  it("strips a leading @ or $ (also doubled)", () => {
    expect(ok("venmo", "@robbie-art")).toBe("robbie-art");
    expect(ok("cashapp", "$robbieart")).toBe("robbieart");
    expect(ok("cashapp", "@robbieart")).toBe("robbieart");
    expect(ok("paypalme", "@robbieart")).toBe("robbieart");
    expect(ok("venmo", "@@robbie-art")).toBe("robbie-art");
  });

  it("rejects spaces, punctuation and unicode inside the name", () => {
    expect(bad("venmo", "robbie art")).toMatch(/venmo/i);
    expect(bad("venmo", "robbie.art")).toMatch(/venmo/i);
    expect(bad("venmo", "robbíe-art")).toMatch(/venmo/i);
    expect(bad("cashapp", "rob.bie")).toMatch(/cash app/i);
    expect(bad("paypalme", "rob_bie")).toMatch(/paypal/i);
  });
});

describe("parsePaymentUsername: pasted links", () => {
  it("extracts a Venmo username from profile URLs", () => {
    expect(ok("venmo", "https://venmo.com/u/robbie-art")).toBe("robbie-art");
    expect(ok("venmo", "venmo.com/u/robbie-art")).toBe("robbie-art");
    expect(ok("venmo", "https://account.venmo.com/u/Robbie_Art")).toBe(
      "Robbie_Art",
    );
    expect(ok("venmo", "https://venmo.com/u/robbie-art/?txn=pay&amount=5")).toBe(
      "robbie-art",
    );
    expect(ok("venmo", "https://venmo.com/robbie-art")).toBe("robbie-art");
  });

  it("extracts a Cash App cashtag from cash.app URLs", () => {
    expect(ok("cashapp", "https://cash.app/$robbieart")).toBe("robbieart");
    expect(ok("cashapp", "cash.app/$robbieart")).toBe("robbieart");
    expect(ok("cashapp", "https://cash.app/$robbieart/10")).toBe("robbieart");
    expect(ok("cashapp", "https://www.cash.app/$RobbieArt?x=1")).toBe(
      "RobbieArt",
    );
  });

  it("extracts a PayPal.me name, ignoring amount suffixes", () => {
    expect(ok("paypalme", "https://paypal.me/robbieart")).toBe("robbieart");
    expect(ok("paypalme", "paypal.me/robbieart")).toBe("robbieart");
    expect(ok("paypalme", "https://www.paypal.me/robbieart/25")).toBe(
      "robbieart",
    );
    expect(ok("paypalme", "https://paypal.com/paypalme/robbieart")).toBe(
      "robbieart",
    );
  });

  it("points people to the right field when the link is for another service", () => {
    expect(bad("venmo", "https://cash.app/$robbieart")).toMatch(/cash app/i);
    expect(bad("cashapp", "https://venmo.com/u/robbie-art")).toMatch(/venmo/i);
    expect(bad("paypalme", "https://venmo.com/u/robbie-art")).toMatch(/venmo/i);
  });

  it("rejects links to unrelated sites and non-web schemes", () => {
    expect(bad("venmo", "https://evil.example/u/robbie-art")).toMatch(/venmo/i);
    expect(bad("venmo", "javascript:alert(1)")).toMatch(/venmo/i);
    expect(bad("cashapp", "https://cash.app.evil.example/$robbieart")).toMatch(
      /cash app/i,
    );
    expect(bad("paypalme", "ftp://paypal.me/robbieart")).toMatch(/paypal/i);
  });
});

describe("parsePaymentUsername: length and shape rules", () => {
  it("Venmo: 5–30 letters, numbers, - and _", () => {
    expect(ok("venmo", "abcde")).toBe("abcde");
    expect(ok("venmo", "a".repeat(30))).toBe("a".repeat(30));
    expect(bad("venmo", "abcd")).toMatch(/5/);
    expect(bad("venmo", "a".repeat(31))).toMatch(/30/);
    expect(ok("venmo", "a_b-c")).toBe("a_b-c");
  });

  it("Cash App: 1–20 letters/digits, starting with a letter", () => {
    expect(ok("cashapp", "a")).toBe("a");
    expect(ok("cashapp", "a1234567890123456789")).toBe("a1234567890123456789");
    expect(bad("cashapp", "a12345678901234567890")).toMatch(/20/);
    expect(bad("cashapp", "1robbie")).toMatch(/letter/i);
    expect(bad("cashapp", "rob-bie")).toMatch(/cash app/i);
    expect(bad("cashapp", "rob_bie")).toMatch(/cash app/i);
  });

  it("PayPal.me: 1–20 letters/digits", () => {
    expect(ok("paypalme", "7")).toBe("7");
    expect(ok("paypalme", "a".repeat(20))).toBe("a".repeat(20));
    expect(bad("paypalme", "a".repeat(21))).toMatch(/20/);
    expect(bad("paypalme", "rob-bie")).toMatch(/paypal/i);
  });

  it("gives plain-language messages, not regex talk", () => {
    for (const [service, raw] of [
      ["venmo", "no"],
      ["cashapp", "9"],
      ["paypalme", "a b"],
    ] as const) {
      const message = bad(service, raw);
      expect(message).not.toMatch(/regex|pattern|\^|\$\//i);
      expect(message.length).toBeGreaterThan(10);
    }
  });
});

describe("buildPaymentLinks", () => {
  const base: PaymentLinkSource = {
    role: "ARTIST",
    handle: "robbie",
    email: "robbie@example.com",
    suspendedAt: null,
    venmoUsername: "robbie-art",
    cashAppTag: "robbieart",
    paypalMeUsername: "robbieart",
    artistProfile: { handle: "robbie", approved: true },
  };

  it("builds https links with labels, in a stable order", () => {
    expect(buildPaymentLinks(base)).toEqual([
      { service: "venmo", label: "Venmo", url: "https://venmo.com/u/robbie-art" },
      { service: "cashapp", label: "Cash App", url: "https://cash.app/$robbieart" },
      { service: "paypalme", label: "PayPal", url: "https://paypal.me/robbieart" },
    ]);
  });

  it("only includes the services that are set", () => {
    const links = buildPaymentLinks({
      ...base,
      venmoUsername: null,
      paypalMeUsername: null,
    });
    expect(links.map((l) => l.service)).toEqual(["cashapp"]);
  });

  it("returns nothing when no field is set", () => {
    expect(
      buildPaymentLinks({
        ...base,
        venmoUsername: null,
        cashAppTag: null,
        paypalMeUsername: null,
      }),
    ).toEqual([]);
  });

  it("never exposes links for a suspended artist", () => {
    expect(buildPaymentLinks({ ...base, suspendedAt: new Date() })).toEqual([]);
  });

  it("never exposes links for members, even with stale fields", () => {
    expect(
      buildPaymentLinks({ ...base, role: "VIEWER", artistProfile: null }),
    ).toEqual([]);
  });

  it("never exposes links for an artist who is not approved yet", () => {
    expect(
      buildPaymentLinks({
        ...base,
        artistProfile: { handle: "robbie", approved: false },
      }),
    ).toEqual([]);
  });

  it("allows admins", () => {
    expect(
      buildPaymentLinks({ ...base, role: "ADMIN", artistProfile: null }),
    ).toHaveLength(3);
  });

  it("hides e2eart test handles (User.handle or artist handle)", () => {
    expect(buildPaymentLinks({ ...base, handle: "e2eart-one" })).toEqual([]);
    expect(
      buildPaymentLinks({
        ...base,
        artistProfile: { handle: "e2eart_two", approved: true },
      }),
    ).toEqual([]);
  });

  it("hides seed identities", () => {
    expect(
      buildPaymentLinks({ ...base, email: "luna@theartistpost.org" }),
    ).toEqual([]);
  });

  it("re-validates stored values so a bad legacy row never becomes a link", () => {
    expect(
      buildPaymentLinks({
        ...base,
        venmoUsername: "x/../evil",
        cashAppTag: "robbieart",
        paypalMeUsername: "a b",
      }).map((l) => l.service),
    ).toEqual(["cashapp"]);
  });
});
