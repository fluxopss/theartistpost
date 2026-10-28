import { normalizeUploadUrl } from "@/server/api/community";
import { absoluteUrl } from "@/server/api/urls";

/**
 * "Presented by" and "Food & vendors" for a night (Phase 2 contract).
 *
 * Founder's Vision guardrails: artists and vendors never pay, so nothing here
 * carries money; a sponsored night says so plainly; unsponsored nights show
 * nothing; only admins set these fields (eventAdmin.ts).
 *
 * The mappers below are also the output filter: whatever is stored, the API
 * only ever returns https links and logos from our own upload store.
 */

export const SPONSOR_NAME_MAX = 80;
export const SPONSOR_URL_MAX = 300;
export const VENDORS_MAX = 12;
export const VENDOR_NAME_MAX = 60;
export const VENDOR_OFFERING_MAX = 80;
export const VENDOR_URL_MAX = 300;

export type PresentedByDTO = {
  name: string;
  url: string | null;
  logoUrl: string | null;
};

export type VendorDTO = {
  name: string;
  offering: string;
  url: string | null;
};

/** An absolute https URL, at most `max` characters; otherwise null. */
export function httpsUrl(value: unknown, max = SPONSOR_URL_MAX): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || !url.hostname) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function presentedByFromRow(row: {
  sponsorName?: string | null;
  sponsorUrl?: string | null;
  sponsorLogoUrl?: string | null;
}): PresentedByDTO | null {
  const name = row.sponsorName?.trim();
  if (!name) return null;
  const logoPath = row.sponsorLogoUrl
    ? normalizeUploadUrl(row.sponsorLogoUrl)
    : null;
  return {
    name: name.slice(0, SPONSOR_NAME_MAX),
    url: httpsUrl(row.sponsorUrl),
    logoUrl: logoPath ? absoluteUrl(logoPath) : null,
  };
}

/** Stored JSON -> the public list. Malformed entries are dropped, never guessed. */
export function vendorsFromJson(value: unknown): VendorDTO[] {
  if (!Array.isArray(value)) return [];
  const out: VendorDTO[] = [];
  for (const item of value) {
    if (out.length >= VENDORS_MAX) break;
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    if (!name) continue;
    const offering =
      typeof entry.offering === "string" ? entry.offering.trim() : "";
    out.push({
      name: name.slice(0, VENDOR_NAME_MAX),
      offering: offering.slice(0, VENDOR_OFFERING_MAX),
      url: httpsUrl(entry.url, VENDOR_URL_MAX),
    });
  }
  return out;
}
