import { z } from "zod";
import {
  isDeniedAuthorEmail,
  TEST_HANDLE_PREFIX,
} from "@/features/posts/denylist";

/**
 * Optional "get paid directly" usernames on artist profiles. Link-out only:
 * The Artist Post stores the username, builds a public https link and nothing
 * else. No processing, no cut, no balances. (App Store 3.2.1(vii): gifts
 * between people, 100% to the recipient.)
 */

export type PaymentService = "venmo" | "cashapp" | "paypalme";

export type PaymentLink = {
  service: PaymentService;
  label: string;
  url: string;
};

export type PaymentUsernameResult =
  | { ok: true; value: string | null }
  | { ok: false; message: string };

type ServiceSpec = {
  label: string;
  /** Hostnames (without `www.`) that belong to this service. */
  hosts: readonly string[];
  /** Characters allowed in the name itself. */
  charset: RegExp;
  min: number;
  max: number;
  startsWithLetter: boolean;
  /** Plain-language rule shown when the name is wrong. */
  rule: string;
  /** First path segment(s) that precede the name in a profile URL. */
  nameFromPath: (segments: string[], host: string) => string | undefined;
  url: (name: string) => string;
};

const SPECS: Record<PaymentService, ServiceSpec> = {
  venmo: {
    label: "Venmo",
    hosts: ["venmo.com", "account.venmo.com"],
    charset: /^[A-Za-z0-9_-]+$/,
    min: 5,
    max: 30,
    startsWithLetter: false,
    rule: "Venmo usernames are 5–30 letters, numbers, - or _.",
    nameFromPath: (segments) =>
      segments[0]?.toLowerCase() === "u" ? segments[1] : segments[0],
    url: (name) => `https://venmo.com/u/${name}`,
  },
  cashapp: {
    label: "Cash App",
    hosts: ["cash.app", "cash.me"],
    charset: /^[A-Za-z0-9]+$/,
    min: 1,
    max: 20,
    startsWithLetter: true,
    rule: "Cash App cashtags are 1–20 letters or numbers, starting with a letter.",
    nameFromPath: (segments) => segments[0],
    url: (name) => `https://cash.app/$${name}`,
  },
  paypalme: {
    label: "PayPal",
    hosts: ["paypal.me", "paypal.com"],
    charset: /^[A-Za-z0-9]+$/,
    min: 1,
    max: 20,
    startsWithLetter: false,
    rule: "PayPal.me names are 1–20 letters or numbers.",
    nameFromPath: (segments, host) =>
      host === "paypal.com"
        ? segments[0]?.toLowerCase() === "paypalme"
          ? segments[1]
          : undefined
        : segments[0],
    url: (name) => `https://paypal.me/${name}`,
  },
};

export const PAYMENT_SERVICES = ["venmo", "cashapp", "paypalme"] as const;

/** Longest raw string we will even look at (a pasted link with a query). */
export const PAYMENT_INPUT_MAX = 300;

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const HOST_LIKE_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i;

function hostService(host: string): PaymentService | null {
  for (const service of PAYMENT_SERVICES) {
    if (SPECS[service].hosts.includes(host)) return service;
  }
  return null;
}

function looksLikeLink(value: string): boolean {
  return (
    value.includes("/") || SCHEME_RE.test(value) || HOST_LIKE_RE.test(value)
  );
}

/**
 * Clean what someone typed or pasted into a payment username field.
 *
 * - blank → `null` (clears the field)
 * - strips leading `@` / `$`
 * - accepts a pasted venmo.com / cash.app / paypal.me link and takes the name
 * - enforces the service's length and character rules
 */
export function parsePaymentUsername(
  service: PaymentService,
  raw: string,
): PaymentUsernameResult {
  const spec = SPECS[service];
  const input = raw.trim();
  if (input === "") return { ok: true, value: null };

  let candidate = input;

  if (looksLikeLink(input)) {
    const notALink = {
      ok: false as const,
      message: `That doesn't look like a ${spec.label} username or link. ${spec.rule}`,
    };
    let url: URL;
    try {
      url = new URL(SCHEME_RE.test(input) ? input : `https://${input}`);
    } catch {
      return notALink;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return notALink;

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const owner = hostService(host);
    if (owner === null) return notALink;
    if (owner !== service) {
      return {
        ok: false,
        message: `That looks like a ${SPECS[owner].label} link. Put it in the ${SPECS[owner].label} field instead.`,
      };
    }

    const segments = url.pathname
      .split("/")
      .filter((segment) => segment !== "")
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      });
    const fromPath = spec.nameFromPath(segments, host);
    if (!fromPath) return notALink;
    candidate = fromPath;
  }

  candidate = candidate.replace(/^[@$]+/, "");
  if (candidate === "") return { ok: true, value: null };

  const valid =
    candidate.length >= spec.min &&
    candidate.length <= spec.max &&
    spec.charset.test(candidate) &&
    (!spec.startsWithLetter || /^[A-Za-z]/.test(candidate));
  if (!valid) return { ok: false, message: spec.rule };

  return { ok: true, value: candidate };
}

/**
 * Zod field for PATCH /me: `undefined` leaves the value alone, `null` or a
 * blank string clears it, anything else must pass `parsePaymentUsername`.
 */
export function paymentUsernameField(service: PaymentService) {
  return z
    .string()
    .max(PAYMENT_INPUT_MAX, "That is too long to be a username or link.")
    .nullable()
    .optional()
    .transform((raw, ctx) => {
      if (raw === undefined) return undefined;
      if (raw === null) return null;
      const result = parsePaymentUsername(service, raw);
      if (!result.ok) {
        ctx.addIssue({ code: "custom", message: result.message });
        return z.NEVER;
      }
      return result.value;
    });
}

export type PaymentLinkSource = {
  role: "VIEWER" | "ARTIST" | "ADMIN";
  handle: string | null;
  email: string;
  suspendedAt: Date | null;
  venmoUsername: string | null;
  cashAppTag: string | null;
  paypalMeUsername: string | null;
  artistProfile: { handle: string; approved: boolean } | null;
};

/** Who may have payment links shown: artists (approved) and admins. */
export function canPublishPaymentLinks(
  user: Pick<
    PaymentLinkSource,
    "role" | "handle" | "email" | "suspendedAt" | "artistProfile"
  >,
): boolean {
  if (user.suspendedAt) return false;
  if (isDeniedAuthorEmail(user.email)) return false;
  const handles = [user.handle, user.artistProfile?.handle];
  if (
    handles.some((h) => h?.toLowerCase().startsWith(TEST_HANDLE_PREFIX))
  ) {
    return false;
  }
  if (user.role === "ADMIN") return true;
  return user.role === "ARTIST" && user.artistProfile?.approved === true;
}

/**
 * Public link list for a profile. Built server-side from stored usernames
 * that are re-validated on the way out, always https, and empty for anyone
 * who is suspended, a test handle, a seed identity or not an artist.
 */
export function buildPaymentLinks(user: PaymentLinkSource): PaymentLink[] {
  if (!canPublishPaymentLinks(user)) return [];

  const stored: Record<PaymentService, string | null> = {
    venmo: user.venmoUsername,
    cashapp: user.cashAppTag,
    paypalme: user.paypalMeUsername,
  };

  const links: PaymentLink[] = [];
  for (const service of PAYMENT_SERVICES) {
    const value = stored[service];
    if (!value) continue;
    const parsed = parsePaymentUsername(service, value);
    if (!parsed.ok || parsed.value === null) continue;
    // A stored name must already be clean: reject anything cleaning changed.
    if (parsed.value !== value) continue;
    links.push({
      service,
      label: SPECS[service].label,
      url: SPECS[service].url(parsed.value),
    });
  }
  return links;
}
